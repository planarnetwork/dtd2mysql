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
 * A source is built for one window and answers for that one. It is not a
 * parameter of the queries because it is not a property of a query: a feed
 * cannot hold six months of trains and three months of the associations that
 * join them together, so there is one window per build and a source per window.
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
   * Which DTD feed this was built from, for feed_info.feed_version - the
   * filename of the most recent one applied, or null if the source cannot say.
   */
  getFeedVersion(): Promise<string | null>;

  /**
   * Every station, with coordinates
   */
  getStops(): Promise<Stop[]>;

  /**
   * Passenger schedules and z-trains that are live at some point in the window.
   */
  getSchedules(): Promise<ScheduleResults>;

  /**
   * Associations - splits, joins and next/previous workings - live at some
   * point in the window.
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
  /**
   * Set where the service runs through the location without stopping, and null
   * where it stops. A row that has one has no arrival or departure of either
   * kind, so it is the only time the call has.
   *
   * Only present at all when the build asked to keep passing points; a source
   * that removes them never emits a row with one.
   */
  scheduled_pass_time: string | null,
  platform: string,
  // The TIPLOC of the timing point, which the stop id is built from. Null where
  // the source has none: a z-train's location is a CRS code already.
  tiploc: string | null,
  activity: string,
  train_class: null | "S" | "B",
  reservations: null | "R" | "S" | "A"
}

/**
 * Station name, coordinate and accessibility overrides applied on top of
 * whatever the source knows. Hardcoded today, with no provenance and no way to
 * update it.
 */
export type StationCoordinates = {
  [crs: string]: {
    stop_lat: number,
    stop_lon: number,
    stop_name: string,
    wheelchair_boarding: 0 | 1 | 2
  }
};
