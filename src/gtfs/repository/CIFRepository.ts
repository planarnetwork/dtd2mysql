
import {DatabaseConnection} from "../../database/DatabaseConnection";
import {Transfer} from "../file/Transfer";
import {CRS, Stop} from "../file/Stop";
import moment = require("moment");
import {ScheduleCalendar} from "../native/ScheduleCalendar";
import {Association, AssociationType, DateIndicator} from "../native/Association";
import {RSID, STP, TUID} from "../native/OverlayRecord";
import {ScheduleBuilder, ScheduleResults} from "./ScheduleBuilder";
import {RouteType} from "../file/Route";
import {Duration} from "../native/Duration";
import {FixedLink} from "../file/FixedLink";

/**
 * Provide access to the CIF/TTIS data in a vaguely GTFS-ish shape.
 */
export class CIFRepository {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly stream,
    private readonly stationCoordinates: StationCoordinates
  ) {}

  /**
   * Return the interchange time between each station
   */
  public async getTransfers(): Promise<Transfer[]> {
    const [results] = await this.db.query<Transfer[]>(`
      SELECT 
        crs_code AS from_stop_id, 
        crs_code AS to_stop_id, 
        2 AS transfer_type, 
        minimum_change_time * 60 AS min_transfer_time 
      FROM physical_station WHERE cate_interchange_status IS NOT NULL
      GROUP BY crs_code
    `);

    return results;
  }

  /**
   * Return all the stops with some configurable long/lat applied
   */
  public async getStops(): Promise<Stop[]> {
    const [results] = await this.db.query<Stop[]>(`
      SELECT
        crs_code AS stop_id, 
        tiploc_code AS stop_code,
        station_name AS stop_name,
        cate_interchange_status AS stop_desc,
        0 AS stop_lat,
        0 AS stop_lon,
        NULL AS zone_id,
        NULL AS stop_url,
        NULL AS location_type,
        NULL AS parent_station,
        IF(POSITION("(CIE" IN station_name), "Europe/Dublin", "Europe/London") AS stop_timezone,
        0 AS wheelchair_boarding 
      FROM physical_station WHERE crs_code IS NOT NULL
      GROUP BY crs_code
    `);

    // overlay the long and latitude values from configuration
    return results.map(stop => Object.assign(stop, this.stationCoordinates[stop.stop_id]));
  }

  /**
   * Return the schedules and z trains. These queries probably require some explanation:
   *
   * The first query selects the stop times for all passenger services between now and + 3 months. It's important that
   * the stop time location is mapped to physical stations to avoid getting fake CRS codes from the tiploc data.
   *
   * The second query selects all the z-trains (usually replacement buses) within three months. They already use CRS
   * codes as the location so avoid the disaster above.
   */
  public async getSchedules(): Promise<ScheduleResults> {
    const scheduleBuilder = new ScheduleBuilder();
    const [[lastSchedule]] = await this.db.query("SELECT id FROM schedule ORDER BY id desc LIMIT 1");

    await Promise.all([
      scheduleBuilder.loadSchedules(this.stream.query(`
        SELECT
          schedule.id AS id, train_uid, retail_train_id, runs_from, runs_to,
          monday, tuesday, wednesday, thursday, friday, saturday, sunday,
          crs_code, stp_indicator, public_arrival_time, public_departure_time,
          IF(train_status="S", "SS", train_category) AS train_category, 
          IFNULL(scheduled_arrival_time, scheduled_pass_time) AS scheduled_arrival_time, 
          IFNULL(scheduled_departure_time, scheduled_pass_time) AS scheduled_departure_time,
          platform, atoc_code, stop_time.id AS stop_id, activity, reservations, train_class
        FROM schedule
        LEFT JOIN schedule_extra ON schedule.id = schedule_extra.schedule
        LEFT JOIN stop_time ON schedule.id = stop_time.schedule
        LEFT JOIN physical_station ps ON location = ps.tiploc_code
        WHERE
        (
          stop_time.id IS NULL OR crs_code IS NOT NULL
        )
        AND runs_from < CURDATE() + INTERVAL 3 MONTH
        AND runs_to >= CURDATE()
        ORDER BY stp_indicator DESC, id, stop_id
      `)),
      scheduleBuilder.loadSchedules(this.stream.query(`
        SELECT
          ${lastSchedule.id} + z_schedule.id AS id, train_uid, null, runs_from, runs_to,
          monday, tuesday, wednesday, thursday, friday, saturday, sunday,
          stp_indicator, location AS crs_code, train_category,
          public_arrival_time, public_departure_time, scheduled_arrival_time, scheduled_departure_time,
          platform, NULL AS atoc_code, z_stop_time.id AS stop_id, activity, NULL AS reservations, "S" AS train_class 
        FROM z_schedule
        JOIN z_stop_time ON z_schedule.id = z_stop_time.z_schedule
        WHERE runs_from < CURDATE() + INTERVAL 3 MONTH
        AND runs_to >= CURDATE()
        ORDER BY stop_id
      `))
    ]);

    return scheduleBuilder.results;
  }

  /**
   * Get associations
   */
  public async getAssociations(): Promise<Association[]> {
    const [results] = await this.db.query<AssociationRow[]>(`
      SELECT 
        a.id AS id, base_uid, assoc_uid, crs_code, assoc_date_ind, assoc_cat,
        monday, tuesday, wednesday, thursday, friday, saturday, sunday,
        start_date, end_date, stp_indicator
      FROM association a
      JOIN tiploc ON assoc_location = tiploc_code
      WHERE start_date < CURDATE() + INTERVAL 3 MONTH
      AND end_date >= CURDATE()
      ORDER BY stp_indicator DESC, id
    `);

    return results.map(row => new Association(
      row.id,
      row.base_uid,
      row.assoc_uid,
      row.crs_code,
      row.assoc_date_ind,
      row.assoc_cat,
      new ScheduleCalendar(
        moment(row.start_date),
        moment(row.end_date), {
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
    const [rows] = await this.db.query<FixedLinkRow>(`
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

    const results: FixedLink[] = [];

    for (const row of rows) {
      results.push(this.getFixedLinkRow(row.origin, row.destination, row));
      results.push(this.getFixedLinkRow(row.destination, row.origin, row));
    }

    return results;
  }

  private getFixedLinkRow(origin: CRS, destination: CRS, row: FixedLinkRow): FixedLink {
    return {
      from_stop_id: origin,
      to_stop_id: destination,
      mode: row.mode,
      duration: row.duration,
      start_time: row.start_time,
      end_time: row.end_time,
      start_date: (row.start_date || "2017-01-01"),
      end_date: (row.end_date || "2038-01-19"),
      monday: row.monday,
      tuesday: row.tuesday,
      wednesday: row.wednesday,
      thursday: row.thursday,
      friday: row.friday,
      saturday: row.saturday,
      sunday: row.sunday
    };
  }

  /**
   * Close the underlying database
   */
  public end(): Promise<any> {
    return Promise.all([this.db.end(), this.stream.end()]);
  }

}

export interface ScheduleStopTimeRow {
  id: number,
  train_uid: TUID,
  retail_train_id: RSID,
  runs_from: string,
  runs_to: string,
  monday: 0 | 1,
  tuesday: 0 | 1,
  wednesday: 0 | 1,
  thursday: 0 | 1,
  friday: 0 | 1,
  saturday: 0 | 1,
  sunday: 0 | 1,
  stp_indicator: STP,
  crs_code: CRS,
  train_category: string,
  atoc_code: string | null,
  public_arrival_time: string | null,
  public_departure_time: string | null,
  scheduled_arrival_time: string | null,
  scheduled_departure_time: string | null,
  platform: string,
  activity: string,
  train_class: null | "S" | "B",
  reservations: null | "R" | "S" | "A"
}

export type StationCoordinates = {
  [crs: string]: {
    stop_lat: number,
    stop_lon: number,
    stop_name: string,
    wheelchair_boarding: 0 | 1 | 2
  }
};

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

interface FixedLinkRow {
  mode: FixedLinkMode;
  duration: Duration;
  origin: CRS;
  destination: CRS;
  start_time: string;
  end_time: string;
  start_date: string | null;
  end_date: string | null;
  monday: 0 | 1;
  tuesday: 0 | 1;
  wednesday: 0 | 1;
  thursday: 0 | 1;
  friday: 0 | 1;
  saturday: 0 | 1;
  sunday: 0 | 1;
}

enum FixedLinkMode {
  Walk = "WALK",
  Metro = "METRO",
  Transfer = "TRANSFER",
  Tube = "TUBE",
  Bus = "BUS"
}
