
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
  /**
   * 0 a boarding point, 1 a station, 2 an entrance. The entrances come from
   * NaPTAN rather than the DTD, which has no concept of a door.
   */
  location_type: LocationType;
  parent_station: StopID | null;
  /**
   * The platform a boarding facility is, set only on a child stop. Null on a
   * station and on the child a call that names no platform points at.
   */
  platform_code: string | null;
  stop_timezone: string;
  wheelchair_boarding: 0 | 1 | 2;
}

export type LocationType = 0 | 1 | 2;

export type StopID = string;
export type CRS = string;
export type TIPLOC = string;

/**
 * stops.txt, as it is written. `toStopRow` makes one from a Stop.
 */
export interface StopRow {
  stop_id: StopID;
  stop_code: CRS;
  stop_name: string;
  stop_desc: string;
  zone_id: number;
  stop_url: string;
  location_type: LocationType;
  parent_station: StopID | null;
  platform_code: string | null;
  stop_timezone: string;
  wheelchair_boarding: 0 | 1 | 2;
  stop_lon: number;
  stop_lat: number;
}
