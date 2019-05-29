import { StopTime } from "../GTFS";
import { TripIDMap } from "./TripsMerger";
import { ParentStops } from "./StopsAndTransfersMerger";
import { Writable } from "stream";

export class StopTimesMerger {

  constructor(
    private readonly stopTimes: Writable
  ) {}

  public async write(stopTimes: StopTime[], tripIdMap: TripIDMap, parentStops: ParentStops): Promise<void> {
    for (const stopTime of stopTimes) {
      if (tripIdMap[stopTime.trip_id]) {
        stopTime.trip_id = tripIdMap[stopTime.trip_id];
        stopTime.stop_id = parentStops[stopTime.stop_id] || stopTime.stop_id;

        await this.push(stopTime);
      }
    }
  }

  private push(data: StopTime): Promise<void> | void {
    const writable = this.stopTimes.write(data);

    if (!writable) {
      return new Promise(resolve => this.stopTimes.once("drain", () => resolve()));
    }
  }

  /**
   * Flush all the data to the output stream
   */
  public async end(): Promise<void[]> {
    return new Promise(resolve => this.stopTimes.end(resolve));
  }

}
