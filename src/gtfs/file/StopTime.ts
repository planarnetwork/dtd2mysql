
import {CRS} from "./Stop";

export interface StopTime {
  trip_id: number;
  arrival_time: string | undefined;
  departure_time: string | undefined;
  stop_id: CRS;
  stop_sequence: number;
  stop_headsign: Platform;
  pickup_type: 0 | 1 | 2 | 3;
  drop_off_type: 0 | 1 | 2 | 3;
  shape_dist_traveled: null;
  timepoint: 0 | 1;
}

export type Platform = string;