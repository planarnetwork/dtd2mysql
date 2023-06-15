import {StopPlatform} from './StopTime';

export interface Stop {
  stop_id: StopPlatform;
  stop_code: CRS;
  stop_name: string;
  stop_desc: string;
  stop_lat: number;
  stop_lon: number;
  zone_id: number;
  stop_url: string;
  location_type: 0 | 1;
  parent_station: CRS;
  stop_timezone: string;
  wheelchair_boarding: 0 | 1 | 2;
  platform_code: string;
}

export type CRS = string;