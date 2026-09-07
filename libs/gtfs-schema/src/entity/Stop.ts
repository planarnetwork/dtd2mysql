
export interface Stop {
  /**
   * The ATCO code: `910G` and the TIPLOC for a station, `9100` and the TIPLOC
   * for a boarding point. See `Atco.ts` for what they are and why.
   */
  stop_id: StopID;
  /**
   * The CRS code of the station this stop belongs to, which is what the build
   * identifies a station by: a schedule calls at `CLJ`, an association names
   * `CLJ`, and the interchange times and fixed links are pairs of them. It is
   * written out as `stop_code`, and carried here rather than read back out of
   * that column so nothing has to know which of the codes that column holds.
   */
  crs: CRS;
  /**
   * The TIPLOC this stop's id is built from - the station's own for a station,
   * the timing point's for a boarding point. Not a column.
   */
  tiploc: TIPLOC;
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
  parent_station: StopID | null;
  /**
   * The platform a boarding facility is, set only on a child stop. Null on a
   * station and on the child a call that names no platform points at.
   */
  platform_code: string | null;
  stop_timezone: string;
  wheelchair_boarding: 0 | 1 | 2;
}

export type StopID = string;
export type CRS = string;
export type TIPLOC = string;

/**
 * stops.txt, as it is written. `toStopRow` makes one from a Stop.
 */
export interface StopRow {
  stop_id: StopID;
  /**
   * The code a rider would recognise: a CRS for a rail station, and whatever
   * the source publishes for anything else.
   */
  stop_code: string | null;
  stop_name: string;
  stop_desc: string | null;
  zone_id: number | string | null;
  stop_url: string | null;
  /**
   * 0 a stop, 1 a station, 2 an entrance, 3 a generic node, 4 a boarding area.
   * A rail feed writes only the first two; null where the source says nothing,
   * which the spec reads as a stop.
   */
  location_type: 0 | 1 | 2 | 3 | 4 | null;
  parent_station: StopID | null;
  platform_code: string | null;
  stop_timezone: string | null;
  wheelchair_boarding: 0 | 1 | 2;
  /**
   * Kept as text where the source gave text: a coordinate that arrived as
   * `51.50740` re-serialises from a number as `51.5074`, dropping a digit of
   * the precision the source published.
   */
  stop_lon: number | string;
  stop_lat: number | string;
}
