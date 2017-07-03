
import {RSID, TUID} from "../native/Schedule";

export interface Trip {
  route_id: number;
  service_id: string;
  trip_id: number;
  trip_headsign: TUID;
  trip_short_name: RSID;
  direction_id: 0 | 1;
  block_id: string;
  shape_id: string;
  wheelchair_accessible: 0 | 1 | 2;
  bikes_allowed: 0 | 1 | 2;
}