import {createHash} from "node:crypto";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";

/**
 * The shape a journey follows.
 *
 * Two journeys over the same route links follow the same path, so the id is a
 * digest of exactly that. It was computed identically in TripsStream and
 * ShapesStream; the two have to agree or trips.txt points at a shape that
 * shapes.txt does not have, so it is computed once here.
 */
export function shapeIdOf(journey: TransXChangeJourney): string {
  return createHash("md5")
    .update(JSON.stringify({routeId: journey.route, routeLinkSeq: journey.routeLinkIds}))
    .digest("hex");
}
