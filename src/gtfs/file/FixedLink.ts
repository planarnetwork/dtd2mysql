
import {Duration} from "../native/Duration";
import {CRS} from "./Stop";

/**
 * Custom format for links.txt
 */
export interface FixedLink {
  from_stop_id: CRS;
  to_stop_id: CRS;
  mode: string;
  duration: Duration;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  monday: 0 | 1;
  tuesday: 0 | 1;
  wednesday: 0 | 1;
  thursday: 0 | 1;
  friday: 0 | 1;
  saturday: 0 | 1;
  sunday: 0 | 1;
}