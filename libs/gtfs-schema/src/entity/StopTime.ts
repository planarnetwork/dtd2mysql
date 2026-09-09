
import {CRS, StopID, TIPLOC} from "./Stop.js";

export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: CRS;
  stop_sequence: number;
  /**
   * Overrides the trip headsign from this stop onwards, for a service whose
   * answer to "where does this train go" changes partway along - a portion
   * that splits, or a bus that changes destination at a timing point.
   *
   * Null where the trip headsign holds for the whole journey.
   */
  stop_headsign: string | null;
  pickup_type: PickupDropOffType;
  drop_off_type: PickupDropOffType;
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

/**
 * stop_times.txt, as it is written. `toStopTimeRow` makes one from a StopTime,
 * turning the platform into the stop id.
 */
export interface StopTimeRow {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: StopID;
  stop_sequence: number;
  stop_headsign: string | null;
  pickup_type: PickupDropOffType;
  drop_off_type: PickupDropOffType;
  /**
   * Distance along the trip's shape at this call. Text where the source's
   * precision matters, as in Shape.
   *
   * Null for a producer that writes no shapes.txt - and null for the rail feed,
   * which does write one. GTFS only reads a distance here where shapes.txt
   * carries one too, and putting one on every call of the largest file in the
   * feed buys too little to be worth its size. See Shapes.ts in
   * `@gb-transit/gtfs`.
   */
  shape_dist_traveled: number | string | null;
  timepoint: 0 | 1;
}

export enum PickupDropOffType {
  Scheduled = 0,
  None = 1,
  PhoneAgency = 2,
  CoordinateWithDriver = 3
}
