
export interface Stop {
  stop_id: CRS;
  stop_code: TIPLOC;
  stop_name: string;
  stop_desc: string;
  /**
   * Null between the source and the build only: a station the feed gives no
   * usable coordinate for. Resolved by locate() before stops.txt is written, so
   * nothing null ever reaches the feed.
   */
  stop_lat: number | null;
  stop_lon: number | null;
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