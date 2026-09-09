import {RowWriter, StopID, StopTimeRow} from "@gb-transit/gtfs-schema";
import {TripIDMap} from "./TripsMerger";
import {ParentStops} from "./StopsAndTransfersMerger";
import {close, push} from "./Push";

/**
 * The stop times of one feed, read on demand.
 *
 * A function rather than a list, because the list is the largest thing a merge
 * holds: the national bus feed's 59 million calls cost 18GB of the 22GB a merge
 * of it and the rail feed needed, and every one of them is written once and
 * never read again.
 *
 * `onRow` is handed a row the reader reuses, so it is copied or forgotten before
 * the next one arrives. `betweenChunks` is awaited each time the reader reaches
 * the end of a chunk of the zip, which is the only place a caller can wait: the
 * rows themselves arrive from a synchronous parser.
 */
export type StopTimeReader = (
  onRow: (row: StopTimeRow) => void,
  betweenChunks: () => Promise<void>
) => Promise<void>;

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
    stopTimes: StopTimeReader,
    tripIdMap: TripIDMap,
    parentStops: ParentStops
  ): Promise<UsedStops> {
    const usedStops: UsedStops = {};

    // One chunk's worth of calls, held only until the reader next pauses. The
    // writer is where the backpressure is, and it cannot be waited on from
    // inside the parser's callback.
    const batch: StopTimeRow[] = [];

    const flush = async () => {
      for (const stopTime of batch) {
        await push(this.stopTimes, stopTime);
      }

      batch.length = 0;
    };

    await stopTimes(
      row => {
        const tripId = tripIdMap[row.trip_id];

        if (tripId === undefined) {
          return;
        }

        const stopId = parentStops[row.stop_id] || row.stop_id;

        usedStops[stopId] = true;

        batch.push({...row, trip_id: tripId, stop_id: stopId});
      },
      flush
    );

    // The reader's last rows arrive after its last chunk, as the inflater and
    // the parser give up what they were holding.
    await flush();

    return usedStops;
  }

  public end(): Promise<void> {
    return close(this.stopTimes);
  }

}

export type UsedStops = Record<StopID, boolean>;
