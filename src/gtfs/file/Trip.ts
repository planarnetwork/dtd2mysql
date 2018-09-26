import {RSID, TUID} from "../native/OverlayRecord";

export interface Trip {
  route_id: number;
  service_id: string;
  trip_id: number;
  trip_headsign: TUID;
  trip_short_name: RSID;
  direction_id: 0 | 1;
  wheelchair_accessible: 0 | 1 | 2;
  bikes_allowed: 0 | 1 | 2;
}