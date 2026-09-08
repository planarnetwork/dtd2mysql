import {parentPort, workerData} from "node:worker_threads";
import type {StopID, Transfer} from "@gb-transit/gtfs-loader";
import type {Network, Timetable} from "raptor-journey-planner";
import {
  StringResults, TransferPatternFile, TransferPatternQuery
} from "transfer-pattern-planner/generate";

/**
 * Finds the transfer patterns for the stations it is given, one at a time.
 *
 * It is handed a timetable rather than a feed to build one from. The timetable is on
 * SharedArrayBuffers, so every worker reads the one the pool built instead of loading the feed
 * again - a feed is hundreds of megabytes and a worker doing this needs none of it. `trips` is
 * empty for the same reason: they name the stop times of a journey, and a pattern only records
 * where a journey changed.
 *
 * Patterns go straight to a file of this worker's own. Folding them into a tree needs all of them
 * in order, which no worker can do alone, so the shard merges the files once every station is done.
 */
export interface WorkerInput {
  readonly timetable: Timetable;
  readonly stopIds: StopID[];
  readonly transfers: Transfer[];
  readonly stations: Map<StopID, StopID>;
  readonly date: string;
  readonly output: string;
}

/** Sent when the worker wants another station. */
export const READY = "ready";

/** Sent once the file is closed and the worker can be taken away. */
export const DONE = "done";

function worker({timetable, stopIds, transfers, stations, date, output}: WorkerInput): void {
  const network: Network = {
    timetable,
    stopIds,
    stopIndex: new Map(stopIds.map((stop, index) => [stop, index])),
    stations,
    transfers,
    trips: []
  };

  const query = new TransferPatternQuery(network, () => new StringResults());
  const planFor = new Date(date);
  const patterns = new TransferPatternFile(output);

  parentPort?.on("message", async (stop: StopID | null) => {
    // nothing left to plan, so finish the file before the pool takes this thread away. Terminate
    // it first and the patterns still in the stream are lost.
    if (stop === null) {
      await patterns.close();
      parentPort?.postMessage(DONE);

      return;
    }

    await patterns.store(query.plan(stop, planFor));
    parentPort?.postMessage(READY);
  });

  parentPort?.postMessage(READY);
}

if (workerData) {
  worker(workerData as WorkerInput);
}
