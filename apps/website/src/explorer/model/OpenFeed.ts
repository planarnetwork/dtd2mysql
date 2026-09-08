import {GTFS_COLUMNS} from "@gb-transit/gtfs-schema";
import {ProgressReporter, readZip, sizeOf, toChunks}
  from "@gb-transit/gtfs-loader";
import type {GTFSSource, LoadProgress, ZipEntry} from "@gb-transit/gtfs-loader";
import {CallIndex, CallStore, callStoreSink} from "./CallStore.js";
import {ColumnStore, columnStoreSink} from "./ColumnStore.js";
import {KNOWN_FILES} from "./FeedIndex.js";
import type {FeedIndex, FileManifest, FeedManifest} from "./FeedIndex.js";

const CALLS = "stop_times.txt";

/** Columns of stop_times.txt read on demand rather than held. See CallStore. */
const NOT_HELD = ["stop_headsign", "shape_dist_traveled"];

export class NotAFeedError extends Error {
  constructor() {
    super("That zip holds no GTFS files. A feed has at least one of agency.txt, stops.txt, "
      + "routes.txt, trips.txt or stop_times.txt in it.");
    this.name = "NotAFeedError";
  }
}

export interface OpenOptions {
  onProgress?: (progress: LoadProgress) => void;
  progressInterval?: number;
}

/**
 * Read everything but the calls.
 *
 * Half a second and 61 MB on the GB feed, which is enough for the overview, every file table and
 * every check that is not about a calling pattern. stop_times.txt is 190 MB of the 200 and is not
 * inflated at all here - readZip skips an entry whose sink is undefined, so the cost of leaving it
 * until asked is nothing.
 */
export async function openFeed(
  name: string,
  source: GTFSSource,
  options: OpenOptions = {}
): Promise<FeedIndex> {
  const files = new Map<string, ColumnStore>();
  const manifests: FileManifest[] = [];
  const other: string[] = [];
  const reporter = new ProgressReporter(options, sizeOf(source));

  let calls: ZipEntry | undefined;

  await readZip(toChunks(source), entry => {
    const file = nameOf(entry.name);

    if (file === undefined) {
      return undefined;
    }
    if (!file.endsWith(".txt") && !file.endsWith(".csv")) {
      other.push(file);

      return undefined;
    }
    if (file === CALLS) {
      // Noted so the manifest can report it, and skipped so it is not inflated.
      calls = entry;

      return undefined;
    }

    return columnStoreSink(store => {
      files.set(file, store);
      manifests.push(describe(file, store.header, store.rows, entry));
      reporter.rows += store.rows;
    });
  }, {
    onBytes: bytes => reporter.onBytes(bytes),
    onEntryBytes: (entry, bytes) => reporter.onEntryBytes(entry, bytes)
  });

  reporter.onBuilding();

  // Judged on whether any file the standard names is in there, not on whether anything was read: a
  // foreign feed's extra files are held and shown, but a zip of nothing but extra files is not a
  // feed. readFeed has no such guard - only loadGTFS does - so a zip of holiday photographs would
  // otherwise open as a feed with nothing in it and no explanation.
  const recognised = calls !== undefined
    || [...files.keys()].some(file => file in GTFS_COLUMNS);

  if (!recognised) {
    throw new NotAFeedError();
  }

  if (calls !== undefined) {
    // Named in the manifest before it is read, with the row count the header cannot give yet, so the
    // overview can offer the second phase rather than pretending the file is not there.
    manifests.push(describe(CALLS, GTFS_COLUMNS["stop_times.txt"], -1, calls));
  }

  return {
    manifest: {name, files: order(manifests), other},
    files
  };
}

/**
 * Read the calls, and index them by trip and by stop.
 *
 * The second pass over the same bytes. It costs a re-inflate of the files already read, which is
 * about half a second of the five, and buys not having to hold 190 MB of text in case somebody asks
 * for it later.
 */
export async function openCalls(
  feed: FeedIndex,
  source: GTFSSource,
  options: OpenOptions = {}
): Promise<FeedIndex> {
  const reporter = new ProgressReporter(options, sizeOf(source));

  let store: CallStore | undefined;

  await readZip(toChunks(source), entry => {
    if (nameOf(entry.name) !== CALLS) {
      return undefined;
    }

    return callStoreSink(built => store = built, entry.originalSize);
  }, {
    onBytes: bytes => reporter.onBytes(bytes),
    onEntryBytes: (entry, bytes) => reporter.onEntryBytes(entry, bytes)
  });

  reporter.onBuilding();

  if (store === undefined) {
    return feed;
  }

  const calls = store;

  feed.calls = calls;
  feed.byTrip = new CallIndex(calls.tripIx, calls.trips.size, calls.rows);
  feed.byStop = new CallIndex(calls.stopIx, calls.stops.size, calls.rows);

  return {
    ...feed,
    manifest: {
      ...feed.manifest,
      files: feed.manifest.files.map(file =>
        file.name === CALLS ? {...file, rows: calls.rows} : file)
    }
  };
}

/**
 * The file a zip entry holds.
 *
 * Matched on the file name alone, so a feed that nests everything in a directory reads the same as
 * one that does not - and the shadow copies a Mac puts in a zip are not the feed.
 */
function nameOf(entry: string): string | undefined {
  if (entry.endsWith("/") || entry.startsWith("__MACOSX/")) {
    return undefined;
  }

  const start = Math.max(entry.lastIndexOf("/"), entry.lastIndexOf("\\")) + 1;
  const name = entry.slice(start);

  return name.startsWith(".") ? undefined : name.toLowerCase();
}

function describe(
  name: string,
  header: readonly string[],
  rows: number,
  entry: ZipEntry
): FileManifest {
  const known = (GTFS_COLUMNS as Record<string, readonly string[]>)[name];

  return {
    name,
    rows,
    header,
    compressedSize: entry.compressedSize,
    originalSize: entry.originalSize,
    unknown: known === undefined ? [] : header.filter(column => !known.includes(column)),
    missing: known === undefined ? [] : known.filter(column => !header.includes(column)),
    notHeld: name === CALLS ? NOT_HELD.filter(column => header.includes(column)) : []
  };
}

/** The order an overview lists them in: what the feed is, then what it is made of, then the rest. */
function order(files: readonly FileManifest[]): FileManifest[] {
  const rank = (name: string) => {
    const known = KNOWN_FILES.indexOf(name as typeof KNOWN_FILES[number]);

    return known === -1 ? KNOWN_FILES.length : known;
  };

  return [...files].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
