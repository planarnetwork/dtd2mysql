import * as fs from "node:fs";
import * as path from "node:path";
import {Worker} from "node:worker_threads";
import type {Network, StopID} from "raptor-journey-planner";
import {DONE, READY} from "./worker.js";
import type {WorkerInput} from "./worker.js";

/**
 * Plan every station on a pool of workers, and return the files they wrote.
 *
 * Work is pulled rather than dealt out: a worker asks for a station when it has finished the last
 * one, so the pool does not have to guess which stations are expensive. They differ by more than an
 * order of magnitude - Waterloo takes seconds where a request stop takes a tenth of one - and a
 * pool that split the list evenly up front would spend most of its time waiting for whichever
 * worker drew the terminals.
 */
export async function planOnWorkers(
  network: Network,
  date: Date,
  stations: readonly StopID[],
  workDir: string,
  prefix: string,
  workers: number,
  planned: (station: StopID) => void
): Promise<string[]> {
  const remaining = [...stations];
  const parts = Array.from(
    {length: Math.min(workers, Math.max(stations.length, 1))},
    (_, id) => path.join(workDir, `${prefix}-${id}.gz`)
  );

  await Promise.all(parts.map(output => new Promise<void>((resolve, reject) => {
    const input: WorkerInput = {
      timetable: network.timetable,
      stopIds: network.stopIds,
      transfers: network.transfers,
      stations: network.stations,
      date: date.toISOString(),
      output
    };
    const worker = new Worker(workerFile(), {workerData: input});

    worker.on("message", (message: string) => {
      if (message === DONE) {
        resolve();
        worker.terminate();

        return;
      }

      const station = remaining.pop();

      if (station === undefined) {
        worker.postMessage(null);
      }
      else {
        planned(station);
        worker.postMessage(station);
      }
    });

    worker.on("error", reject);
  })));

  return parts;
}

/**
 * The worker, whether this is running from source or from the build. A Worker is given a path
 * rather than a module to resolve, so which of the two it is has to be settled here.
 */
function workerFile(): string {
  const candidates = ["worker.js", "worker.ts"].map(file => path.join(__dirname, file));
  const worker = candidates.find(file => fs.existsSync(file));

  if (worker === undefined) {
    throw new Error(`Could not find the worker, looked in ${candidates.join(" and ")}`);
  }

  return worker;
}
