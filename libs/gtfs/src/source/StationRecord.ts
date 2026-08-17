import proj4 from "proj4";
import {Stop} from "../entity/Stop";
import {StationCoordinates} from "./TimetableSource";
import {inBounds} from "./Bounds";

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
  easting: number | null;
  northing: number | null;
}

/**
 * Stations whose coordinates are genuinely outside the bounds. Hoek van Holland
 * is a real place the timetable reaches by ferry and the MSN locates it
 * correctly, so it is named here rather than widening the bounds across the
 * North Sea for one station.
 */
const outsideBounds = new Set(["HVH"]);

/**
 * The projected coordinate, or nulls where the feed does not have one.
 *
 * Absent covers two cases. The field is all zeroes, which the MSN schema parses
 * as absent; and the field holds something that cannot be a place, which is only
 * visible once projected - `19500` unwinds to an easting of 950,000, well past
 * the eastern edge of the National Grid, and lands in the North Sea. Neither is
 * a coordinate, and inventing one for either is worse than saying so.
 */
function located(row: StationRecord): [number | null, number | null] {
  if (row.easting === null || row.northing === null) {
    return [null, null];
  }

  const [lon, lat] = proj4("EPSG:27700", "EPSG:4326", [
    (row.easting - 10000) * 100,
    (row.northing - 60000) * 100
  ]);

  return inBounds(lat, lon) || outsideBounds.has(row.crs_code) ? [lon, lat] : [null, null];
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
  const [stop_lon, stop_lat] = located(row);

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
