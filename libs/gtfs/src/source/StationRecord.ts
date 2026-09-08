import proj4 from "proj4";
import {Stop} from "@gb-transit/gtfs-schema";
import {StationCoordinates} from "./TimetableSource";
import {inBounds} from "./Bounds";
import {NOWHERE} from "./Located";
import {stationId} from "../transform/Atco";

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
function position(row: StationRecord): {stop_lon: number, stop_lat: number, located: boolean} {
  if (row.easting === null || row.northing === null) {
    return {...NOWHERE, located: false};
  }

  const [stop_lon, stop_lat] = proj4("EPSG:27700", "EPSG:4326", [
    (row.easting - 10000) * 100,
    (row.northing - 60000) * 100
  ]);

  return inBounds(stop_lat, stop_lon) || outsideBounds.has(row.crs_code)
    ? {stop_lon, stop_lat, located: true}
    : {...NOWHERE, located: false};
}

const MAX_DISAGREEMENT_METRES = 5000;

const EARTH_RADIUS_METRES = 6371000;

export function metresApart(
  a: {stop_lat: number, stop_lon: number},
  b: {stop_lat: number, stop_lon: number}
): number {
  const radians = Math.PI / 180;
  const north = (b.stop_lat - a.stop_lat) * radians;
  const east = (b.stop_lon - a.stop_lon) * radians * Math.cos((a.stop_lat + b.stop_lat) / 2 * radians);

  return Math.hypot(north, east) * EARTH_RADIUS_METRES;
}

function agreeing(
  crs: string,
  override: StationCoordinates[string] | undefined,
  dtd: {stop_lat: number, stop_lon: number, located: boolean}
): StationCoordinates[string] | Omit<StationCoordinates[string], "stop_lat" | "stop_lon"> | undefined {
  if (override === undefined || !dtd.located) {
    return override;
  }

  const apart = metresApart(dtd, override);

  if (apart <= MAX_DISAGREEMENT_METRES) {
    return override;
  }

  const {stop_lat, stop_lon, ...rest} = override;

  console.warn(
    `${crs} is ${Math.round(apart / 1000)}km from where the DTD puts it - ` +
    `override ${stop_lat},${stop_lon} against ${dtd.stop_lat},${dtd.stop_lon}. ` +
    `Keeping the DTD's position: check station-coordinates.ts.`
  );

  return rest;
}

/**
 * Turn a station record into a GTFS stop.
 *
 * The coordinates are OSGB eastings and northings held in a form that has to be
 * undone before projecting - `(easting - 10000) * 100` - and then overlaid with
 * whatever `station-coordinates.ts` says, unless the two disagree by more than
 * anything that could be a survey. Both halves go when the coordinates come
 * from a source that has them in WGS84 already.
 *
 * The CRS and the TIPLOC are both kept: the CRS is what the build identifies a
 * station by and what the file publishes as `stop_code`, and the TIPLOC is what
 * the ATCO code is built from. The overrides are keyed on CRS, which is the code
 * a person editing them has.
 */
export function toStop(row: StationRecord, overrides: StationCoordinates): Stop {
  const {stop_lon, stop_lat, located} = position(row);
  const override = agreeing(row.crs_code, overrides[row.crs_code], {stop_lat, stop_lon, located});

  return Object.assign({
    stop_id: stationId(row.tiploc_code),
    crs: row.crs_code,
    tiploc: row.tiploc_code,
    stop_name: row.station_name,
    stop_desc: row.cate_interchange_status,
    zone_id: null,
    stop_url: null,
    location_type: null,
    parent_station: null,
    platform_code: null,
    stop_timezone: row.station_name.includes("(CIE") ? "Europe/Dublin" : "Europe/London",
    wheelchair_boarding: 0,
    stop_lon,
    stop_lat,
    located
  } as unknown as Stop, override);
}
