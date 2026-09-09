import {RowWriter, StopID, StopTimeRow} from "@gb-transit/gtfs-schema";
import {TripIDMap} from "./TripsMerger";
import {close, push} from "./Push";

export class StopTimesMerger {

  constructor(
    private readonly stopTimes: RowWriter<StopTimeRow>
  ) {}

  /**
   * Start writing the calls of one feed.
   *
   * The calls arrive from a reader rather than as a list, because the list is the
   * largest thing a merge held: the national bus feed's 59 million calls cost
   * 18GB of the 22GB a merge of it and the rail feed needed, and every one of
   * them is written once and never read again.
   */
  public begin(tripIdMap: TripIDMap): StopTimesPass {
    return new StopTimesPass(this.stopTimes, tripIdMap);
  }

  public end(): Promise<void> {
    return close(this.stopTimes);
  }

}

/**
 * The calls of one feed, remapped onto the station each stop belongs to and
 * written as they arrive.
 *
 * What it collects is the stops that were called at, which is what decides which
 * stops are published.
 */
export class StopTimesPass {

  public readonly usedStops: UsedStops = {};

  private readonly batch: StopTimeRow[] = [];

  constructor(
    private readonly stopTimes: RowWriter<StopTimeRow>,
    private readonly tripIdMap: TripIDMap
  ) {}

  public row(row: StopTimeRow): void {
    const tripId = this.tripIdMap[row.trip_id];

    if (tripId === undefined) {
      return;
    }

    // Where the feed said the vehicle stops, which is the platform rather than
    // the station it is under.
    const stopId = row.stop_id;

    this.usedStops[stopId] = true;

    // Copied because the reader hands back the same object every time, and this
    // one is not written until the chunk it arrived in has been read.
    this.batch.push({...row, trip_id: tripId, stop_id: stopId});
  }

  public async flush(): Promise<void> {
    for (const row of this.batch) {
      await push(this.stopTimes, row);
    }

    this.batch.length = 0;
  }

}

export type UsedStops = Record<StopID, boolean>;
