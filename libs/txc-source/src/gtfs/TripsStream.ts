import {TripRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {TRIPS} from "./TxcFeed";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {shapeIdOf} from "./ShapeId";

/**
 * Extract the trips from the TransXChange journeys
 */
export class TripsStream extends RowStream<TransXChangeJourney, TripRow> {
  public readonly file = TRIPS;

  protected transform(journey: TransXChangeJourney): void {
    this.pushRow({
      route_id: journey.route,
      service_id: journey.calendar.id,
      trip_id: String(journey.trip.id),
      trip_headsign: journey.trip.headsign,
      trip_short_name: journey.trip.shortName,
      direction_id: journey.trip.direction === "outbound" ? 0 : 1,
      wheelchair_accessible: 0,
      bikes_allowed: 0,
      block_id: journey.blockId || "",
      shape_id: shapeIdOf(journey)
    });
  }

}
