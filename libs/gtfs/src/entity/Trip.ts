import {RSID, TUID} from "../model/OverlayRecord";

export interface Trip {
  route_id: number;
  service_id: number;
  trip_id: string;
  trip_headsign: TUID;
  trip_short_name: RSID;
  direction_id: 0 | 1;
  wheelchair_accessible: 0 | 1 | 2;
  bikes_allowed: 0 | 1 | 2;
}