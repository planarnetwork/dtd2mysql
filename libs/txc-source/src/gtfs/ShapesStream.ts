import {ShapeRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {SHAPES} from "./TxcFeed";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {shapeIdOf} from "./ShapeId";
import {Location, RouteLink} from "../transxchange/TransXChange";

// https://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the earth in metres
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function routeLinkDistance(routeLink: RouteLink): number {
  let distance = 0;
  let lastLoc: Location | null = null;
  for (const location of routeLink.Locations) {
    if (lastLoc !== null) {
      distance += getDistanceFromLatLonInM(lastLoc.Latitude, lastLoc.Longitude, location.Latitude, location.Longitude);
    }
    lastLoc = location;
  }
  return distance;
}

/**
 * Generate shapes from the location data
 */
export class ShapesStream extends RowStream<TransXChangeJourney, ShapeRow> {
  public readonly file = SHAPES;

  protected existingShapes: Set<string> = new Set();

  protected transform(journey: TransXChangeJourney): void {
    let sequence = 0;
    const shapeId = shapeIdOf(journey);

    if (this.existingShapes.has(shapeId)) {
      return;
    }
    this.existingShapes.add(shapeId);

    let lastLocAdded: Location | null = null;
    let distanceSoFarM = 0;

    for (const link of journey.routeLinks) {
      // The TXC file only gives a distance per route link, not per point within it, but GTFS wants a
      // distance on each shape point. We approximate per-point distances via Haversine and scale them
      // so the per-link total matches the TXC figure. Fall back to a 1x scale when the measured
      // distance is zero so we don't divide by zero and emit NaN.
      const measured = routeLinkDistance(link);
      const scaleFactor = measured > 0 ? link.Distance / measured : 1;

      let linkDistance = 0;
      for (const location of link.Locations) {
        if (
          lastLocAdded !== null &&
          lastLocAdded.Latitude === location.Latitude &&
          lastLocAdded.Longitude === location.Longitude
        ) {
          continue;
        }
        linkDistance += lastLocAdded
          ? getDistanceFromLatLonInM(lastLocAdded.Latitude, lastLocAdded.Longitude, location.Latitude, location.Longitude)
          : 0;

        this.pushRow({
          shape_id: shapeId,
          shape_pt_lat: location.Latitude,
          shape_pt_lon: location.Longitude,
          shape_pt_sequence: sequence++,
          // Kept as the fixed five decimal places it was written with: turning
          // it into a number would drop the trailing zeros.
          shape_dist_traveled: ((distanceSoFarM + linkDistance * scaleFactor) / 1000).toFixed(5)
        });

        lastLocAdded = location;
      }
      distanceSoFarM += link.Distance;
    }
  }

}
