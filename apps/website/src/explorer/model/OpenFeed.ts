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
 * Read a feed.
 *
 * Every file in one pass, stop_times.txt included. It is 181 MB of the 202 and 2.9 million of the
 * 3.3 million rows, so it dominates the wait - about two and a half seconds against half a second
 * for everything else - but it is not a different kind of thing and it does not load like one. Half
 * of what the explorer does needs it, and a feed that is open with some of its files missing is a
 * state every view has to know about and get right.
 *
 * It is still *held* differently, in CallStore, because 2.9 million rows as objects cost 893 MB and
 * as six typed arrays cost 55. That difference is what makes the feed something a browser can hold
 * at all. It is invisible from out here.
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

  let calls: CallStore | undefined;
  let callsEntry: ZipEntry | undefined;

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
      callsEntry = entry;

      return callStoreSink(store => {
        calls = store;
        reporter.rows += store.rows;
      }, entry.originalSize);
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
  const recognised = callsEntry !== undefined
    || [...files.keys()].some(file => file in GTFS_COLUMNS);

  if (!recognised) {
    throw new NotAFeedError();
  }

  const store = calls as CallStore | undefined;

  if (callsEntry !== undefined) {
    manifests.push(describe(
      CALLS,
      store?.header ?? GTFS_COLUMNS["stop_times.txt"],
      store?.rows ?? 0,
      callsEntry
    ));
  }

  return {
    manifest: {name, files: order(manifests), other},
    files,
    ...(store === undefined ? {} : {
      calls: store,
      byTrip: new CallIndex(store.tripIx, store.trips.size, store.rows),
      byStop: new CallIndex(store.stopIx, store.stops.size, store.rows)
    })
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
