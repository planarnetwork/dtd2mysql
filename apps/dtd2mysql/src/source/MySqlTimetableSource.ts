
import {Pool} from "mysql2";
import {DatabaseConnection} from "../database/DatabaseConnection";
import {
  Association,
  AssociationType,
  CRS,
  DateIndicator,
  DateRange,
  FixedLink,
  FixedLinkRecord,
  ScheduleBuilder,
  ScheduleCalendar,
  ScheduleResults,
  StationCoordinates,
  StationRecord,
  STP,
  Stop,
  TimetableSource,
  toFixedLinks,
  interchange,
  toStop,
  withoutPlaceholders,
  reportDroppedStops,
  Transfer
} from "@gb-rail/gtfs";

/**
 * Provide access to the CIF/TTIS data in a vaguely GTFS-ish shape.
 */
export class MySqlTimetableSource implements TimetableSource {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly stream: Pool,
    private readonly stationCoordinates: StationCoordinates
  ) {}

  /**
   * Return the interchange time between each station
   */
  public async getTransfers(): Promise<Transfer[]> {
    const [results] = await this.db.query<{from_stop_id: string, min_transfer_time: number}>(`
      SELECT 
        crs_code AS from_stop_id, 
        crs_code AS to_stop_id, 
        2 AS transfer_type, 
        minimum_change_time * 60 AS min_transfer_time 
      FROM physical_station WHERE cate_interchange_status IS NOT NULL
      GROUP BY crs_code
    `);

    // Through interchange() rather than returned as they come back: the rows
    // have the four standard columns and Transfer now has twelve more, and the
    // CSV writer takes its header from the first row it is given.
    return results.map(row => interchange(row.from_stop_id, row.min_transfer_time));
  }

  /**
   * The last file ImportFeedCommand recorded. A missing table or an empty log
   * both mean the same thing here as they do to LogTableFeedCursor: nothing is
   * known, so say nothing rather than guess.
   */
  public async getFeedVersion(): Promise<string | null> {
    try {
      const [[log]] = await this.db.query<{filename: string | null}>(
        "SELECT filename FROM log ORDER BY id DESC LIMIT 1"
      );

      return log?.filename ?? null;
    }
    catch (err) {
      return null;
    }
  }

  /**
   * Return all the stops with some configurable long/lat applied.
   *
   * One row per CRS, preferring a TIPLOC that describes the station itself.
   * `cate_interchange_status` is the CATE interchange rating - 0 for a station
   * that is not an interchange, 1 to 3 for how significant an interchange it is,
   * and **9 for a subsidiary location**: a junction or an approach that shares
   * the station's CRS without being the place a passenger stands. Reading has
   * `RDNGSTN` rated 2 and `RDNGORJ` rated 9.
   *
   * Grouping alone keeps whichever row came first, which published the
   * subsidiary TIPLOC as `stop_code` for 75 stations. Ordering a derived table
   * does not fix it - MariaDB is free to ignore that - so the row is chosen
   * explicitly.
   *
   * The TIPLOC itself breaks the tie, because some stations have nothing else
   * to separate them: Westbury's TIPLOCs are all rated 9. Falling back to the
   * order rows happen to arrive in makes this source and the file source
   * disagree.
   */
  public async getStops(): Promise<Stop[]> {
    const {stops} = await this.stations();

    return stops;
  }

  /**
   * Every station as a stop, with the operator placeholders taken out and their
   * codes kept so getSchedules can drop the stop times that call at them. Held
   * as a promise because both callers want it and neither runs first.
   */
  private stations(): Promise<{stops: Stop[], dropped: Set<string>}> {
    return this.stationsQ ??= this.db
      .query<StationRecord>(`
        SELECT crs_code, tiploc_code, station_name, cate_interchange_status, easting, northing
        FROM (
          SELECT *, ROW_NUMBER() OVER (
            PARTITION BY crs_code ORDER BY cate_interchange_status <=> 9, tiploc_code
          ) AS preference
          FROM physical_station
          WHERE crs_code IS NOT NULL
        ) ranked
        WHERE preference = 1
        ORDER BY crs_code
      `)
      .then(([results]) => withoutPlaceholders(results.map(row => toStop(row, this.stationCoordinates))));
  }

  private stationsQ?: Promise<{stops: Stop[], dropped: Set<string>}>;

  /**
   * Return the schedules and z trains. These queries probably require some explanation:
   *
   * The first query selects the stop times for all passenger services live in the window. It's important that
   * the stop time location is mapped to physical stations to avoid getting fake CRS codes from the tiploc data.
   *
   * The second query selects the z-trains (usually replacement buses) over the same window. They already use CRS
   * codes as the location so avoid the disaster above.
   *
   * Both windows come from the same DateRange, so a range longer than the default does not produce
   * more trains than replacement buses.
   */
  public async getSchedules(range: DateRange): Promise<ScheduleResults> {
    const {dropped} = await this.stations();
    const scheduleBuilder = new ScheduleBuilder(dropped);
    const [[lastSchedule]] = await this.db.query<{id: number}>("SELECT id FROM schedule ORDER BY id desc LIMIT 1");

    if (!lastSchedule) {
      throw new Error(
        "The schedule table is empty, so there is no timetable to export. " +
        "Import a timetable feed first: dtd2mysql --timetable /path/to/RJTTFxxx.ZIP"
      );
    }
    const window = [range.to.toString(), range.from.toString()];

    await Promise.all([
      scheduleBuilder.loadSchedules(this.stream.query(`
        SELECT
          schedule.id AS id, train_uid, retail_train_id, runs_from, runs_to,
          monday, tuesday, wednesday, thursday, friday, saturday, sunday,
          crs_code, stp_indicator, public_arrival_time, public_departure_time,
          IF(train_status="S", "SS", train_category) AS train_category,
          scheduled_arrival_time AS scheduled_arrival_time,
          scheduled_departure_time AS scheduled_departure_time,
          platform, location AS tiploc, atoc_code, stop_time.id AS stop_id, activity, reservations, train_class
        FROM schedule
        LEFT JOIN schedule_extra ON schedule.id = schedule_extra.schedule
        LEFT JOIN stop_time ON schedule.id = stop_time.schedule
        LEFT JOIN physical_station ps ON location = ps.tiploc_code
        WHERE
        (
          stop_time.id IS NULL OR crs_code IS NOT NULL
        )
        AND runs_from < ?
        AND runs_to >= ?
        AND scheduled_pass_time is null
        ORDER BY stp_indicator DESC, id, stop_id
      `, window)),
      scheduleBuilder.loadSchedules(this.stream.query(`
        SELECT
          ${lastSchedule.id} + z_schedule.id AS id, train_uid, null, runs_from, runs_to,
          monday, tuesday, wednesday, thursday, friday, saturday, sunday,
          stp_indicator, location AS crs_code, train_category,
          public_arrival_time, public_departure_time, scheduled_arrival_time, scheduled_departure_time,
          platform, NULL AS tiploc, atoc_code, z_stop_time.id AS stop_id, activity, NULL AS reservations, "S" AS train_class
        FROM z_schedule
        LEFT JOIN z_schedule_extra ON z_schedule.id = z_schedule_extra.schedule
        JOIN z_stop_time ON z_schedule.id = z_stop_time.z_schedule
        WHERE runs_from < ?
        AND runs_to >= ?
        ORDER BY stop_id
      `, window))
    ]);

    reportDroppedStops(scheduleBuilder.dropped);

    return scheduleBuilder.results;
  }

  /**
   * Get associations
   */
  public async getAssociations(range: DateRange): Promise<Association[]> {
    const [results] = await this.db.query<AssociationRow>(`
      SELECT 
        a.id AS id, base_uid, assoc_uid, crs_code, assoc_date_ind, assoc_cat,
        monday, tuesday, wednesday, thursday, friday, saturday, sunday,
        start_date, end_date, stp_indicator
      FROM association a
      JOIN tiploc ON assoc_location = tiploc_code
      WHERE start_date < ?
      AND end_date >= ?
      ORDER BY stp_indicator DESC, id
    `, [range.to.toString(), range.from.toString()]);

    return results.map(row => new Association(
      row.id,
      row.base_uid,
      row.assoc_uid,
      row.crs_code,
      row.assoc_date_ind,
      row.assoc_cat,
      new ScheduleCalendar(
        Temporal.PlainDate.from(row.start_date),
        Temporal.PlainDate.from(row.end_date), {
        0: row.sunday,
        1: row.monday,
        2: row.tuesday,
        3: row.wednesday,
        4: row.thursday,
        5: row.friday,
        6: row.saturday
      }),
      row.stp_indicator
    ));
  }

  /**
   * Return the ALF information
   */
  public async getFixedLinks(): Promise<FixedLink[]> {
    // use the additional fixed links if possible and fill the missing data with fixed_links
    const [rows] = await this.db.query<FixedLinkRecord>(`
      SELECT
        mode, duration * 60 as duration, origin, destination,
        start_time, end_time, start_date, end_date,
        monday, tuesday, wednesday, thursday, friday, saturday, sunday
      FROM additional_fixed_link
      WHERE origin IN (SELECT crs_code FROM physical_station)
      AND destination IN (SELECT crs_code FROM physical_station)
      UNION
      SELECT
        mode, duration * 60 as duration, origin, destination,
        "00:00:00", "23:59:59", "2017-01-01", "2038-01-19",
        1,1,1,1,1,1,1
      FROM fixed_link
      WHERE CONCAT(origin, destination) NOT IN (
        SELECT CONCAT(origin, destination) FROM additional_fixed_link
      )
    `);

    return rows.flatMap(toFixedLinks);
  }

  /**
   * Close the underlying database
   */
  public end(): Promise<any> {
    return Promise.all([this.db.end(), this.stream.end()]);
  }

}

interface AssociationRow {
  id: number;
  base_uid: string;
  assoc_uid: string;
  crs_code: CRS;
  start_date: string;
  end_date: string;
  assoc_date_ind: DateIndicator,
  assoc_cat: AssociationType,
  sunday: 0 | 1;
  monday: 0 | 1;
  tuesday: 0 | 1;
  wednesday: 0 | 1;
  thursday: 0 | 1;
  friday: 0 | 1;
  saturday: 0 | 1;
  stp_indicator: STP;
}

