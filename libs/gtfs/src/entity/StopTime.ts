
import {CRS, TIPLOC} from "./Stop";

export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: CRS;
  stop_sequence: number;
  /**
   * Overrides the trip headsign from this stop onwards, which a GB rail service
   * never needs. Always null.
   */
  stop_headsign: null;
  pickup_type: 0 | 1 | 2 | 3;
  drop_off_type: 0 | 1 | 2 | 3;
  shape_dist_traveled: null;
  timepoint: 0 | 1;
  /**
   * The platform this call is at, carried through the build and turned into the
   * stop id only when stop_times.txt is written. It is not a column: the feed
   * expresses a platform as a child stop, and this is how the writer knows which
   * one. Null where the feed names none.
   */
  platform: string | null;
  /**
   * The timing point this call is at, which is what the stop id is built from -
   * `9100` and the TIPLOC, so a call at Clapham Junction's West London platforms
   * is `9100CLPHMJW3` rather than something named after the station's own TIPLOC.
   * Carried and composed exactly as `platform` is, and not a column either.
   *
   * Null where the source has no TIPLOC to give: a z-train's location is a CRS
   * code already. The station's own TIPLOC stands in for those.
   */
  tiploc: TIPLOC | null;
}

export type Platform = string;