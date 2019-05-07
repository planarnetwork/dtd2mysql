
import {DatabaseConnection} from "../../database/DatabaseConnection";
import {Transfer} from "../file/Transfer";
import {CRS, Stop} from "../file/Stop";
import moment = require("moment");
import {ScheduleCalendar, Days} from "../native/ScheduleCalendar";
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
    private readonly stationCoordinates: StationCoordinates,
    private readonly startRange,
    private readonly endRange,
    private readonly _excludeFixedLinks: boolean = false,
  ) {}

  get excludeFixedLinks() {
    return this._excludeFixedLinks;
  }

  /**
   * Return the interchange time between each station
   */
  public async getTransfers(): Promise<Transfer[]> {
    const [results] = await this.db.query<Transfer[]>(`
    SELECT 
    crs_code AS from_stop_id, 
    crs_code AS to_stop_id, 
    2 AS transfer_type, 
    loc.min_change_time * 60 AS min_transfer_time 
  FROM master_location as loc WHERE loc.interchange_status != ""
  AND loc.crs_code != ""
  GROUP BY loc.crs_code
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
    tiploc AS stop_code,
    station_name AS stop_name,
    interchange_status AS stop_desc,
    0 AS stop_lat,
    0 AS stop_lon,
    NULL AS zone_id,
    NULL AS stop_url,
    NULL AS location_type,
    NULL AS parent_station,
    IF(POSITION("(CIE" IN station_name), "Europe/Dublin", "Europe/London") AS stop_timezone,
    0 AS wheelchair_boarding 
  FROM master_location WHERE (crs_code IS NOT NULL AND crs_code != "")
  GROUP BY crs_code
    `);

    // overlay the long and latitude values from configuration
    return results;
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
    const query = this.stream.query(`
      SELECT 
 s.schedule_id as id,
 s.train_uid, 
 e.rsid as retail_train_id, 
 greatest(s.wef_date, COALESCE(s.import_wef_date, s.wef_date)) as runs_from, 
 least(s.weu_date, COALESCE(s.import_weu_date, s.weu_date)) as runs_to,


SUBSTRING(s.valid_days, 1, 1 ) as monday,
SUBSTRING(s.valid_days, 2, 1 ) as tuesday,
SUBSTRING(s.valid_days, 3, 1 ) as wednesday,
SUBSTRING(s.valid_days, 4, 1 ) as thursday,
SUBSTRING(s.valid_days, 5, 1 ) as friday,
SUBSTRING(s.valid_days, 6, 1 ) as saturday,
SUBSTRING(s.valid_days, 7, 1 ) as sunday,

loc.crs_code as crs_code, s.stp_indicator as stp_indicator,
sloc.public_arrival_time, sloc.public_departure_time,
IF(s.train_status="S", "SS", s.train_category) AS train_category, 
IFNULL(sloc.scheduled_arrival_time, sloc.scheduled_pass_time) AS scheduled_arrival_time, 
IFNULL(sloc.scheduled_departure_time, sloc.scheduled_pass_time) AS scheduled_departure_time,
sloc.platform, e.atoc_code, sloc.schedule_location_id AS stop_id, 
COALESCE(sloc.activity, "") as activity, s.reservations, s.train_class

FROM cif_schedule as s 

LEFT JOIN cif_schedule_extra as e
	ON e.schedule_id = s.schedule_id
LEFT JOIN cif_schedule_location as sloc
	ON sloc.schedule_id = s.schedule_id
LEFT JOIN master_location as loc
	ON sloc.tiploc = loc.tiploc
	
WHERE 
	(sloc.schedule_location_id IS NULL OR (loc.crs_code IS NOT NULL AND loc.crs_code != "") )
	AND s.wef_date < ?
  AND s.weu_date >= ?
  AND (s.import_weu_date IS NULL OR (s.import_weu_date > ?) )
  
  HAVING runs_to >= runs_from
ORDER BY stp_indicator DESC, s.schedule_id, sloc.location_order


      `, [this.endRange, this.startRange, this.startRange]);
      await Promise.all([
      scheduleBuilder.loadSchedules(query),
      // scheduleBuilder.loadSchedules(this.stream.query(`
      //   SELECT
      //     ${lastSchedule.id} + z_schedule.id AS id, train_uid, null, runs_from, runs_to,
      //     monday, tuesday, wednesday, thursday, friday, saturday, sunday,
      //     stp_indicator, location AS crs_code, train_category,
      //     public_arrival_time, public_departure_time, scheduled_arrival_time, scheduled_departure_time,
      //     platform, NULL AS atoc_code, z_stop_time.id AS stop_id, activity, NULL AS reservations, "S" AS train_class 
      //   FROM z_schedule
      //   JOIN z_stop_time ON z_schedule.id = z_stop_time.z_schedule
      //   WHERE runs_from < CURDATE()
      //   AND runs_to >= CURDATE() - INTERVAL 1 DAY
      //   ORDER BY stop_id
      // `))
    ]);
    console.log("Schedule size", scheduleBuilder.results.schedules.length);
    return scheduleBuilder.results;
  }

  /**
   * Get associations
   */
  public async getAssociations(): Promise<Association[]> {
    const [results] = await this.db.query<AssociationRow[]>(`
    SELECT a.association_id as id,
    a.main_train_uid as base_uid,
    a.associated_train_uid as assoc_uid,
    loc.crs_code,
   a.association_date_ind as assoc_date_ind,
    a.association_category as assoc_cat,
   SUBSTRING(a.valid_days, 1, 1 ) as monday,
   SUBSTRING(a.valid_days, 2, 1 ) as tuesday,
   SUBSTRING(a.valid_days, 3, 1 ) as wednesday,
   SUBSTRING(a.valid_days, 4, 1 ) as thursday,
   SUBSTRING(a.valid_days, 5, 1 ) as friday,
   SUBSTRING(a.valid_days, 6, 1 ) as saturday,
   SUBSTRING(a.valid_days, 7, 1 ) as sunday,
   a.wef_date as start_date,
   a.weu_date as end_date,
   a.stp_indicator
    FROM cif_association as a
     
     JOIN master_location as loc ON a.association_tiploc = loc.tiploc
   
     WHERE a.wef_date < ?
     AND a.weu_date >= ?
     AND (loc.crs_code IS NOT NULL AND loc.crs_code != "")
     ORDER BY a.stp_indicator DESC, a.association_id;
    `, [this.endRange, this.startRange]);
    console.log("Assosiation size:" ,results.length)
    return results.map(row => new Association(
      row.id,
      row.base_uid,
      row.assoc_uid,
      row.crs_code,
      row.assoc_date_ind,
      row.assoc_cat,
      new ScheduleCalendar(
        moment(row.start_date),
        moment(row.end_date), <Days>{
        0: Number(row.sunday),
        1: Number(row.monday),
        2: Number(row.tuesday),
        3: Number(row.wednesday),
        4: Number(row.thursday),
        5: Number(row.friday),
        6: Number(row.saturday)
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
      WHERE origin IN (SELECT crs_code FROM master_location)
      AND destination IN (SELECT crs_code FROM master_location)
      UNION
      SELECT
        link_mode, link_time * 60 as duration, origin, destination,
        "00:00:00", "23:59:59", "2017-01-01", "2038-01-19",
        1,1,1,1,1,1,1
      FROM ttis_fixed_link
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
    stop_name: string
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
  saturda: 0 | 1;
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
