import {
  AgencyRow, AreaRow, AttributionRow, CalendarDateRow, CalendarRow, FeedInfoRow, FixedLinkRow,
  GTFS_COLUMNS, RouteRow, ShapeRow, StopAreaRow, StopRow, StopTimeRow, TransferRow, TripRow
} from "@gb-transit/gtfs-schema";
import {Row} from "./CSVParser.js";

/**
 * The files this reads, and the row each is read into.
 *
 * Named after the file rather than after one of its rows, because that is what a
 * caller has: a merge is told to read `stops.txt`, not a `stop`.
 */
export interface FeedRowTypes {
  "agency.txt": AgencyRow;
  "areas.txt": AreaRow;
  "attributions.txt": AttributionRow;
  "calendar.txt": CalendarRow;
  "calendar_dates.txt": CalendarDateRow;
  "feed_info.txt": FeedInfoRow;
  "links.txt": FixedLinkRow;
  "routes.txt": RouteRow;
  "shapes.txt": ShapeRow;
  "stop_areas.txt": StopAreaRow;
  "stops.txt": StopRow;
  "stop_times.txt": StopTimeRow;
  "transfers.txt": TransferRow;
  "trips.txt": TripRow;
}

export type FeedFileName = keyof FeedRowTypes;

export const FEED_FILES: readonly FeedFileName[] = [
  "agency.txt", "areas.txt", "attributions.txt", "calendar.txt", "calendar_dates.txt",
  "feed_info.txt", "links.txt", "routes.txt", "shapes.txt", "stop_areas.txt", "stops.txt",
  "stop_times.txt", "transfers.txt", "trips.txt"
];

/**
 * The file a zip entry holds, or undefined for one this does not read.
 *
 * Matched on the file name alone, so a feed that nests everything in a directory
 * reads the same as one that does not - and __MACOSX's shadow copies are not the
 * feed.
 */
export function feedFileOf(name: string): FeedFileName | undefined {
  if (name.endsWith("/") || name.startsWith("__MACOSX/")) {
    return undefined;
  }

  const start = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\")) + 1;
  const file = name.slice(start).toLowerCase() as FeedFileName;

  return FEED_FILES.includes(file) ? file : undefined;
}

/**
 * The columns to slice out of each file: every column the schema knows it may
 * carry. Anything else the file has is left in the chunk.
 */
export const READ_COLUMNS: Record<FeedFileName, readonly string[]> = {
  "agency.txt": GTFS_COLUMNS["agency.txt"],
  "areas.txt": GTFS_COLUMNS["areas.txt"],
  "attributions.txt": GTFS_COLUMNS["attributions.txt"],
  "calendar.txt": GTFS_COLUMNS["calendar.txt"],
  "calendar_dates.txt": GTFS_COLUMNS["calendar_dates.txt"],
  "feed_info.txt": GTFS_COLUMNS["feed_info.txt"],
  "links.txt": GTFS_COLUMNS["links.txt"],
  "routes.txt": GTFS_COLUMNS["routes.txt"],
  "shapes.txt": GTFS_COLUMNS["shapes.txt"],
  "stop_areas.txt": GTFS_COLUMNS["stop_areas.txt"],
  "stops.txt": GTFS_COLUMNS["stops.txt"],
  "stop_times.txt": GTFS_COLUMNS["stop_times.txt"],
  "transfers.txt": GTFS_COLUMNS["transfers.txt"],
  "trips.txt": GTFS_COLUMNS["trips.txt"]
};

/**
 * The columns of each file that are numbers rather than text.
 *
 * Everything else is left as the string the file held. That is the round trip:
 * a value the writer wrote is read back as something the writer writes
 * identically, so reading a feed and writing it out again produces the same
 * bytes. Coercing a coordinate would break it - `51.50740` becomes `51.5074` -
 * which is why the coordinates are not in here.
 */
const NUMERIC: Record<FeedFileName, readonly string[]> = {
  "agency.txt": [],
  "areas.txt": [],
  "attributions.txt": ["is_producer", "is_operator", "is_authority"],
  "calendar.txt": [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ],
  "calendar_dates.txt": ["exception_type"],
  "feed_info.txt": [],
  "links.txt": [
    "duration", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ],
  "routes.txt": ["route_type"],
  "shapes.txt": ["shape_pt_sequence"],
  "stop_areas.txt": [],
  "stops.txt": ["location_type", "wheelchair_boarding"],
  "stop_times.txt": ["stop_sequence", "pickup_type", "drop_off_type", "timepoint"],
  "transfers.txt": [
    "transfer_type", "min_transfer_time", "monday", "tuesday", "wednesday", "thursday", "friday",
    "saturday", "sunday"
  ],
  "trips.txt": ["direction_id", "wheelchair_accessible", "bikes_allowed"]
};

/**
 * A parsed row as the row type of its file.
 *
 * CSVParser leaves an empty field undefined, which is what the writer writes an
 * absent value as, so an empty column stays absent rather than becoming 0 or "".
 */
export function toRow<F extends FeedFileName>(file: F, row: Row): FeedRowTypes[F] {
  const out: Record<string, string | number | undefined> = {};
  const numeric = NUMERIC[file];

  for (const column of READ_COLUMNS[file]) {
    const value = row[column];

    out[column] = value !== undefined && numeric.includes(column) ? Number(value) : value;
  }

  // Through unknown: the row is assembled column by column from a table keyed by
  // the same file, so it has the fields the row type declares, but nothing in
  // the types ties the loop to F.
  return out as unknown as FeedRowTypes[F];
}
