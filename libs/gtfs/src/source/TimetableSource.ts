import {Association} from "../model/Association";
import {CRS, Stop} from "../entity/Stop";
import {FixedLink} from "../entity/FixedLink";
import {RSID, STP, TUID} from "../model/OverlayRecord";
import {ScheduleResults} from "../build/ScheduleBuilder";
import {Transfer} from "../entity/Transfer";

/**
 * Where the timetable comes from. The build depends on this and nothing else, so
 * a feed can be produced from a database, from the CIF files directly, or from
 * anything else that can answer these five questions.
 *
 * The ordering of `getSchedules` is part of the contract: schedules must arrive
 * grouped by schedule and sorted stp_indicator DESC, id, stop_sequence, because
 * applyOverlays relies on cancellations and overlays following the permanent
 * record they replace.
 */
export interface TimetableSource {

  /**
   * Interchange time between each station
   */
  getTransfers(): Promise<Transfer[]>;

  /**
   * Every station, with coordinates
   */
  getStops(): Promise<Stop[]>;

  /**
   * Passenger schedules and z-trains within the given range.
   *
   * `range` is a MySQL interval expression such as "3 MONTH". It is the one
   * part of this interface that leaks the storage engine; ticket T1 replaces it
   * with a date window derived from an injected clock.
   */
  getSchedules(range: string): Promise<ScheduleResults>;

  /**
   * Associations - splits, joins and next/previous workings
   */
  getAssociations(): Promise<Association[]>;

  /**
   * Fixed links: the walking, tube and bus interchanges from ALF and FLF
   */
  getFixedLinks(): Promise<FixedLink[]>;

  /**
   * Release whatever the source is holding open
   */
  end(): Promise<any>;

}

/**
 * One row of the schedule/stop time join a source produces. `stop_id` is null
 * when the schedule has no stop times at all.
 */
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
  // stop_time.id from the LEFT JOIN in getSchedules - null when the schedule has no stop times
  stop_id: number | null,
  public_arrival_time: string | null,
  public_departure_time: string | null,
  scheduled_arrival_time: string | null,
  scheduled_departure_time: string | null,
  platform: string,
  activity: string,
  train_class: null | "S" | "B",
  reservations: null | "R" | "S" | "A"
}

/**
 * Station name, coordinate and accessibility overrides applied on top of
 * whatever the source knows. Ticket D7 replaces this with an enricher.
 */
export type StationCoordinates = {
  [crs: string]: {
    stop_lat: number,
    stop_lon: number,
    stop_name: string,
    wheelchair_boarding: 0 | 1 | 2
  }
};
