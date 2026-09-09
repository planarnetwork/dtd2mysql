import {CallIndex, CallStore} from "./CallStore.js";
import {ColumnStore} from "./ColumnStore.js";

/**
 * What the zip turned out to contain, before any of it was read.
 *
 * The overview renders this, and it is also what tells the page whether the second phase is worth
 * offering: a feed with no stop_times.txt has nothing to load.
 */
export interface FeedManifest {
  readonly name: string;
  readonly files: readonly FileManifest[];
  /** Files in the zip that are not CSV, which a feed is not supposed to have but some do. */
  readonly other: readonly string[];
}

export interface FileManifest {
  readonly name: string;
  readonly rows: number;
  readonly header: readonly string[];
  readonly compressedSize?: number;
  readonly originalSize?: number;
  /** Columns the header has that GTFS and this repository's own extensions do not describe. */
  readonly unknown: readonly string[];
  /** Columns the schema describes that this file does not carry. */
  readonly missing: readonly string[];
  /** Columns read on demand rather than held, which is stop_times.txt only. */
  readonly notHeld: readonly string[];
}

/**
 * A feed, opened.
 *
 * Phase A is every file but stop_times.txt: about half a second and 61 MB on the GB feed, and enough
 * for the overview, the file tables, and every check that does not concern a calling pattern. Phase
 * B is the 2.9 million calls, which cost five seconds and 100 MB and are asked for rather than
 * assumed.
 */
export interface FeedIndex {
  readonly manifest: FeedManifest;
  /** By file name, as the zip spelled it. Everything but stop_times.txt. */
  readonly files: ReadonlyMap<string, ColumnStore>;
  /** The calls, once phase B has run. */
  calls?: CallStore;
  /** Where each trip's calls are, and where each stop's are. Built with the calls. */
  byTrip?: CallIndex;
  byStop?: CallIndex;
}

/** The file names this understands, in the order an overview should list them. */
export const KNOWN_FILES = [
  "feed_info.txt", "agency.txt", "attributions.txt", "routes.txt", "trips.txt", "stop_times.txt",
  "stops.txt", "calendar.txt", "calendar_dates.txt", "transfers.txt", "links.txt", "areas.txt",
  "stop_areas.txt", "shapes.txt", "frequencies.txt", "pathways.txt", "levels.txt"
] as const;

/**
 * Rows are held in file order with nothing dropped - CSVParser skips a blank line, and the checks
 * assert the count - so the row a validator names by csvRowNumber is at this index. That identity is
 * what makes a notice a link rather than a number.
 */
export function rowOfCsvRowNumber(csvRowNumber: number): number {
  return csvRowNumber - 2;
}

export function csvRowNumberOf(row: number): number {
  return row + 2;
}

/** A stop's calls, in calling order, or nothing if the calls have not been loaded. */
export function callsAtStop(feed: FeedIndex, stopId: string): Int32Array {
  if (feed.calls === undefined || feed.byStop === undefined) {
    return new Int32Array(0);
  }

  return feed.byStop.of(feed.calls.stops.lookup(stopId));
}

/** A trip's calls, in calling order, or nothing if the calls have not been loaded. */
export function callsOnTrip(feed: FeedIndex, tripId: string): Int32Array {
  if (feed.calls === undefined || feed.byTrip === undefined) {
    return new Int32Array(0);
  }

  return feed.byTrip.of(feed.calls.trips.lookup(tripId));
}
