import {RowWriter, StopID, StopTimeRow} from "@gb-transit/gtfs-schema";
import {TripIDMap} from "./TripsMerger";
import {ParentStops} from "./StopsAndTransfersMerger";
import {close, push} from "./Push";

export class StopTimesMerger {

  constructor(
    private readonly stopTimes: RowWriter<StopTimeRow>
  ) {}

  /**
   * Write the stop times of the trips that survived, remapping each call onto the
   * station its stop belongs to, and return the stops that were actually called
   * at - which is what decides which stops are published.
   */
  public async write(
    stopTimes: StopTimeRow[],
    tripIdMap: TripIDMap,
    parentStops: ParentStops
  ): Promise<UsedStops> {
    const usedStops: UsedStops = {};

    for (const stopTime of stopTimes) {
      const tripId = tripIdMap[stopTime.trip_id];

      if (tripId !== undefined) {
        stopTime.trip_id = tripId;
        stopTime.stop_id = parentStops[stopTime.stop_id] || stopTime.stop_id;
        usedStops[stopTime.stop_id] = true;

        await push(this.stopTimes, stopTime);
      }
    }

    return usedStops;
  }

  public end(): Promise<void> {
    return close(this.stopTimes);
  }

}

export type UsedStops = Record<StopID, boolean>;
