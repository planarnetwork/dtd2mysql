import {CRS, Stop, StopRow} from "../entity/Stop";

/**
 * Somewhere to put a stop the feed uses but cannot locate.
 *
 * `stop_lat` and `stop_lon` are required in GTFS, so a stop that survives into
 * the feed has to have a coordinate whether or not one is known. Null Island is
 * the conventional way to say the value is missing, and it has the useful
 * property of being obviously wrong: a validator flags it and nobody mistakes it
 * for a survey. A plausible-looking default, a national centroid say, would hide
 * exactly what needs finding.
 */
export const NOWHERE = {stop_lat: 0, stop_lon: 0};

/**
 * Drop the stops that have no coordinate of their own and no reason to be here.
 *
 * The coordinate itself is already set - the source applies the default when it
 * projects, because it is the only thing that knows the feed gave it nothing.
 * This decides who is published and says so.
 *
 * A station with no coordinate that nothing references contributes nothing but a
 * self-referencing row in transfers.txt, so it is not published. That is 43 CIE
 * stations today: they are in the MSN because they are ticketable, but no train
 * in the feed calls at one. They come back the moment a source can locate them.
 *
 * A station with no coordinate that something does reference keeps its place and
 * takes the default, because dropping it would take service with it.
 */
export function locate(stops: Stop[], referenced: ReadonlySet<CRS>): Stop[] {
  const dropped: CRS[] = [];
  const defaulted: CRS[] = [];

  const located = stops.filter(stop => {
    if (stop.located) {
      return true;
    }

    if (!referenced.has(stop.crs)) {
      dropped.push(stop.stop_id);

      return false;
    }

    defaulted.push(stop.stop_id);

    return true;
  });

  if (dropped.length > 0) {
    console.log(`Dropped ${dropped.length} stations with no coordinate that nothing calls at`);
  }

  if (defaulted.length > 0) {
    console.warn(
      `${defaulted.length} station(s) have no coordinate but are used, so they are at 0,0 ` +
      `until an override gives them one: ${defaulted.sort().join(", ")}`
    );
  }

  return located;
}

/**
 * stops.txt as it is written.
 *
 * `located`, `crs` and `tiploc` are what the build needs and the file has no
 * column for. They are projected out here rather than deleted from the object,
 * so the internal type can carry what the build needs and the row stays exactly
 * the GTFS columns - the same split `toStopTimeRow` makes for the platform.
 *
 * `stop_code` is the CRS. GTFS defines it as the code a passenger sees, which
 * CRS is - it is on the ticket and the departure board - and `stop_id` is a
 * dataset key, which is why the ATCO code is there instead.
 */
export function toStopRow(stop: Stop): StopRow {
  return {
    stop_id: stop.stop_id,
    stop_code: stop.crs,
    stop_name: stop.stop_name,
    stop_desc: stop.stop_desc,
    zone_id: stop.zone_id,
    stop_url: stop.stop_url,
    location_type: stop.location_type,
    parent_station: stop.parent_station,
    platform_code: stop.platform_code,
    stop_timezone: stop.stop_timezone,
    wheelchair_boarding: stop.wheelchair_boarding,
    stop_lon: stop.stop_lon,
    stop_lat: stop.stop_lat
  };
}
