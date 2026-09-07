import * as os from "node:os";
import * as path from "node:path";
import {Container, DEFAULT_LATITUDE} from "./Container";
import {toGTFSDate} from "./gtfs/calendar/gtfsDateUtils";

export interface MergeOptions {
  /** Feeds to merge, in order. */
  readonly inputs: readonly string[];
  /** A `.zip`, or a directory to write the files into. */
  readonly output: string;
  /** Prepended to every stop id, for feeds that do not share an id space. */
  readonly stopPrefix?: string;
  /** Kilometres between two stops for a walk transfer to be generated. 0 for none. */
  readonly transferDistance?: number;
  /** Drop everything before this date, `YYYYMMDD`. Undefined keeps the past. */
  readonly filterDatesBefore?: string;
  /** GTFS route types to drop, as numbers. */
  readonly removeRouteTypes?: readonly string[];
  /** The latitude the distance approximation is calibrated at. */
  readonly rulerLatitude?: number;
  /** Where the files are assembled before being zipped. */
  readonly tmp?: string;
}

/**
 * Merge feeds into one.
 *
 * The function the CLI is a wrapper around, so the end to end tests can merge
 * without a subprocess and `require("gtfsmerge")` does not run a merge.
 */
export async function merge(options: MergeOptions): Promise<void> {
  const {
    inputs,
    output,
    stopPrefix = "",
    transferDistance = 1.6,
    filterDatesBefore,
    removeRouteTypes = [],
    rulerLatitude = DEFAULT_LATITUDE,
    tmp = fsTemp()
  } = options;

  if (inputs.length === 0) {
    throw new Error("No input feeds given.");
  }

  await new Container()
    .getMergeCommand(tmp, transferDistance, [...removeRouteTypes], rulerLatitude)
    .run([...inputs], output, stopPrefix, filterDatesBefore);
}

export {toGTFSDate};

function fsTemp(): string {
  return path.join(os.tmpdir(), `gtfsmerge_${process.pid}`);
}
