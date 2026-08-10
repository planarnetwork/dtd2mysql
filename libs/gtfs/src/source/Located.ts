import {CRS, Stop} from "../entity/Stop";

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
 * Give every stop a coordinate, dropping the ones that turn out not to need one.
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
    if (stop.stop_lat !== null && stop.stop_lon !== null) {
      return true;
    }

    if (!referenced.has(stop.stop_id)) {
      dropped.push(stop.stop_id);

      return false;
    }

    Object.assign(stop, NOWHERE);
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
