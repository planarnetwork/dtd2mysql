import proj4 from "proj4";
import {Stop} from "../entity/Stop";
import {StationCoordinates} from "./TimetableSource";

proj4.defs(
  "EPSG:27700",
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 " +
  "+ellps=airy +datum=OSGB36 +units=m +no_defs"
);

/**
 * One station as the MSN file describes it, whichever route it arrived by.
 */
export interface StationRecord {
  crs_code: string;
  tiploc_code: string;
  station_name: string;
  cate_interchange_status: number | null;
  easting: number;
  northing: number;
}

/**
 * Turn a station record into a GTFS stop.
 *
 * The coordinates are OSGB eastings and northings held in a form that has to be
 * undone before projecting - `(easting - 10000) * 100` - and then overlaid with
 * whatever `station-coordinates.ts` says. Both halves go when the coordinates
 * come from a source that has them in WGS84 already.
 *
 * The property order matters. csv-write-stream takes the column order from the
 * first row it is given, so this is what fixes the order of stops.txt.
 */
export function toStop(row: StationRecord, overrides: StationCoordinates): Stop {
  const [stop_lon, stop_lat] = proj4("EPSG:27700", "EPSG:4326", [
    (row.easting - 10000) * 100,
    (row.northing - 60000) * 100
  ]);

  return Object.assign({
    stop_id: row.crs_code,
    stop_code: row.tiploc_code,
    stop_name: row.station_name,
    stop_desc: row.cate_interchange_status,
    zone_id: null,
    stop_url: null,
    location_type: null,
    parent_station: null,
    stop_timezone: row.station_name.includes("(CIE") ? "Europe/Dublin" : "Europe/London",
    wheelchair_boarding: 0,
    stop_lon,
    stop_lat
  } as unknown as Stop, overrides[row.crs_code]);
}
