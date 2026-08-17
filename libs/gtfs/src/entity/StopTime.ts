
import {CRS} from "./Stop";

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
}

export type Platform = string;