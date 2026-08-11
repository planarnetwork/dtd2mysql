
export interface Stop {
  stop_id: CRS;
  stop_code: TIPLOC;
  stop_name: string;
  stop_desc: string;
  stop_lat: number;
  stop_lon: number;
  /**
   * Whether the coordinate is the feed's or the default stood in for it. The
   * source knows; nothing downstream could tell from the numbers.
   */
  located: boolean;
  zone_id: number;
  stop_url: string;
  location_type: 0 | 1;
  parent_station: CRS | null;
  /**
   * The platform a boarding facility is, set only on a child stop. Null on a
   * station and on a stop with no platforms beneath it.
   */
  platform_code: string | null;
  stop_timezone: string;
  wheelchair_boarding: 0 | 1 | 2;
}

export type CRS = string;
export type TIPLOC = string;