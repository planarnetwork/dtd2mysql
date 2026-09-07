import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {createHash} from 'crypto';

/**
 * Extract the trips from the TransXChange journeys
 */
export class TripsStream extends GTFSFileStream<TransXChangeJourney> {
  protected header = "route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,wheelchair_accessible,bikes_allowed,block_id,shape_id";

  protected transform(journey: TransXChangeJourney): void {
    this.pushLine(
      journey.route,
      journey.calendar.id,
      journey.trip.id,
      journey.trip.headsign,
      journey.trip.shortName,
      journey.trip.direction === "outbound" ? 0 : 1,
      0,
      0,
      journey.blockId || "",
      createHash('md5').update(JSON.stringify({ routeId: journey.route, routeLinkSeq: journey.routeLinkIds })).digest("hex")
    );
  }

}

