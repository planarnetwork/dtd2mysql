import {PickupDropOffType, StopTimeRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {STOP_TIMES} from "./TxcFeed";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";

/**
 * Extract the stop times from the TransXChange journeys
 */
export class StopTimesStream extends RowStream<TransXChangeJourney, StopTimeRow> {
  public readonly file = STOP_TIMES;

  protected transform(journey: TransXChangeJourney): void {
    let sequence = 0;

    for (const stop of journey.stops) {
      this.pushRow({
        trip_id: String(journey.trip.id),
        arrival_time: stop.arrivalTime,
        departure_time: stop.departureTime,
        stop_id: stop.stop,
        stop_sequence: sequence++,
        stop_headsign: stop.headsign ?? "",
        pickup_type: stop.pickup ? PickupDropOffType.Scheduled : PickupDropOffType.None,
        drop_off_type: stop.dropoff ? PickupDropOffType.Scheduled : PickupDropOffType.None,
        shape_dist_traveled: stop.shapeDistTraveled,
        timepoint: stop.exactTime ? 1 : 0
      });
    }
  }

}
