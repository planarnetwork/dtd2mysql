import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";

/**
 * Extract the stop times from the TransXChange journeys
 */
export class StopTimesStream extends GTFSFileStream<TransXChangeJourney> {
  protected header = "trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled,timepoint";

  protected transform(journey: TransXChangeJourney): void {
    let sequence = 0;

    for (const stop of journey.stops) {
      this.pushLine(
        journey.trip.id,
        stop.arrivalTime,
        stop.departureTime,
        stop.stop,
        sequence++,
        stop.headsign ?? "",
        stop.pickup ? 0 : 1,
        stop.dropoff ? 0 : 1,
        stop.shapeDistTraveled,
        stop.exactTime ? "1" : "0"
      );
    }
  }

}

