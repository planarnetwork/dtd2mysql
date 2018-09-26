import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";

/**
 * Extract the trips from the TransXChange journeys
 */
export class TripsStream extends GTFSFileStream<TransXChangeJourney> {
  protected header = "route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,wheelchair_accessible,bikes_allowed";

  protected transform(journey: TransXChangeJourney): void {
    this.pushLine([
      journey.route,
      journey.calendar.id,
      journey.trip.id,
      journey.trip.headsign,
      journey.trip.headsign,
      0,
      0,
      0
    ].join());
  }

}

