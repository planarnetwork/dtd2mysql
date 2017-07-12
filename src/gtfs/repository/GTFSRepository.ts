
import {DatabaseConnection} from "../../database/DatabaseConnection";
import {Transfer} from "../file/Transfer";
import {CRS, Stop} from "../file/Stop";
import {Schedule} from "../native/Schedule";
import {StopTime} from "../file/StopTime";
import moment = require("moment");
import {ScheduleCalendar} from "../native/ScheduleCalendar";
import {RouteType} from "../file/Route";
import {Association, AssociationType, DateIndicator} from "../native/Association";
import {RSID, STP, TUID} from "../native/OverlayRecord";

/**
 * Provide access to the CIF data in a vaguely GTFS-ish shape.
 */
export class GTFSRepository {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly stream,
    private readonly stationCoordinates: StationCoordinates
  ) {}

  /**
   * Return the interchange time between each station
   */
  public async getTransfers(): Promise<Transfer[]> {
    // combine the interchange time with fixed links and a reverse of each fixed link (they are bi-directional)
    const [results] = await this.db.query<Transfer[]>(`
      SELECT 
        crs_code AS from_stop_id, 
        crs_code AS to_stop_id, 
        2 AS transfer_type, 
        minimum_change_time * 60 AS duration 
      FROM physical_station
      UNION
      SELECT 
        origin AS from_stop_id, 
        destination AS to_stop_id, 
        2 AS transfer_type, 
        duration * 60 AS duration 
      FROM fixed_link
      UNION
      SELECT 
        destination AS from_stop_id, 
        origin AS to_stop_id, 
        2 AS transfer_type, 
        duration * 60 AS duration 
      FROM fixed_link
    `);

    return results;
  }

  public async getStops(): Promise<Stop[]> {
    const [results] = await this.db.query<Stop[]>(`
      SELECT
        crs_code AS stop_id,             
        tiploc_code AS stop_code,           
        description AS stop_name,           
        description AS stop_desc,           
        NULL AS stop_lat,            
        NULL AS stop_lon,            
        NULL AS zone_id,             
        NULL AS stop_url,            
        NULL AS location_type,       
        NULL AS parent_station,      
        "Europe/London" AS stop_timezone,       
        0 AS wheelchair_boarding 
      FROM tiploc 
      WHERE crs_code IS NOT NULL 
      AND description IS NOT NULL
      ORDER BY crs_code
    `);

    // overlay the long and latitude values from configuration
    return results.map(stop => Object.assign(stop, this.stationCoordinates[stop.stop_id]));
  }

  public async getSchedules(): Promise<Schedule[]> {
    const scheduleBuilder = new ScheduleBuilder();

    await Promise.all([
      scheduleBuilder.loadSchedules(this.stream.query(`
        SELECT
          schedule.id AS id, train_uid, retail_train_id, runs_from, runs_to,
          monday, tuesday, wednesday, thursday, friday, saturday, sunday,
          stp_indicator, crs_code, train_category,
          public_arrival_time, public_departure_time, scheduled_arrival_time, scheduled_departure_time,
          platform, atoc_code, stop_time.id AS stop_id
        FROM schedule
        LEFT JOIN schedule_extra ON schedule.id = schedule_extra.schedule
        LEFT JOIN stop_time ON schedule.id = stop_time.schedule
        LEFT JOIN tiploc ON location = tiploc_code
        WHERE stop_time.id IS NULL OR (scheduled_arrival_time IS NOT NULL OR scheduled_departure_time IS NOT NULL)
        ORDER BY stp_indicator DESC, id, stop_id
      `)),
      scheduleBuilder.loadSchedules(this.stream.query(`
        SELECT
          500000 + z_schedule.id AS id, train_uid, null, runs_from, runs_to,
          monday, tuesday, wednesday, thursday, friday, saturday, sunday,
          stp_indicator, location AS crs_code, train_category,
          public_arrival_time, public_departure_time, scheduled_arrival_time, scheduled_departure_time,
          platform, null, z_stop_time.id AS stop_id
        FROM z_schedule
        JOIN z_stop_time ON z_schedule.id = z_stop_time.z_schedule
        ORDER BY stop_id
      `))
    ]);

    return scheduleBuilder.schedules;
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
   * Close the underlying database
   */
  public end(): Promise<any> {
    return Promise.all([this.db.end(), this.stream.end()]);
  }

}

interface ScheduleStopTimeRow {
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
  location: CRS,
  train_category: string,
  atoc_code: string | null,
  public_arrival_time: string | null,
  public_departure_time: string | null,
  scheduled_arrival_time: string | null,
  scheduled_departure_time: string | null,
  platform: string
}

class ScheduleBuilder {
  public readonly schedules: Schedule[] = [];

  /**
   * Take a stream of ScheduleStopTimeRow, turn them into Schedule objects and add the result to the schedules
   */
  public loadSchedules(results: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let stops: StopTime[] = [];
      let prevRow: ScheduleStopTimeRow;
      let departureHour = 4;

      results.on("result", row => {
        if (prevRow && prevRow.id !== row.id) {
          this.schedules.push(this.createSchedule(prevRow, stops));
          stops = [];

          departureHour = row.public_departure_time ? parseInt(row.public_departure_time.substr(0, 2), 10) : 4;
        }

        stops.push({
          trip_id: row.id,
          arrival_time: this.formatTime(row.public_arrival_time || row.scheduled_arrival_time, departureHour),
          departure_time: this.formatTime(row.public_departure_time || row.scheduled_departure_time, departureHour),
          stop_id: row.crs_code,
          stop_sequence: stops.length + 1,
          stop_headsign: row.platform,
          pickup_type: row.public_departure_time ? 0 : 1,
          drop_off_type: row.public_arrival_time ? 0 : 1,
          shape_dist_traveled: null,
          timepoint: 1
        });

        prevRow = row;
      });

      results.on("end", () => {
        this.schedules.push(this.createSchedule(prevRow, stops));

        resolve();
      });
      results.on("error", reject);
    });
  }

  private createSchedule(row: ScheduleStopTimeRow, stops: StopTime[]): Schedule {
    return new Schedule(
      row.id,
      stops,
      row.train_uid,
      row.retail_train_id,
      new ScheduleCalendar(
        moment(row.runs_from),
        moment(row.runs_to),
        {
          0: row.sunday,
          1: row.monday,
          2: row.tuesday,
          3: row.wednesday,
          4: row.thursday,
          5: row.friday,
          6: row.saturday
        }
      ),
      RouteTypeIndex[row.train_category] || RouteType.Rail,
      row.atoc_code,
      row.stp_indicator
    );
  }

  private formatTime(time: string | null, originDepartureHour: number) {
    if (time === null) return null;

    const departureHour = parseInt(time.substr(0, 2), 10);

    // if the service started after 4am and after the current stops departure hour we've probably rolled over midnight
    if (originDepartureHour >= 4 && originDepartureHour > departureHour) {
      return (departureHour + 24) + time.substr(2);
    }

    return time;
  }
}

const RouteTypeIndex = {
  "OO": RouteType.Rail,
  "XX": RouteType.Rail,
  "XZ": RouteType.Rail,
  "BR": RouteType.Gondola,
  "BS": RouteType.Bus,
  "OL": RouteType.Subway,
  "XC": RouteType.Rail,
  "SS": RouteType.Ferry
};

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