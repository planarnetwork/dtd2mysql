import {
  AgencyRow, AttributionRow, CalendarDateRow, CalendarRow, FeedInfoRow, FixedLinkRow, GTFS_COLUMNS,
  RouteRow, ShapeRow, StopRow, StopTimeRow, TransferRow, TripRow, fileSchema
} from "@gb-transit/gtfs-schema";

/**
 * The files a GB rail feed writes, and the columns of each.
 *
 * Transcribed from the committed golden feed, which is the record of what this
 * repository publishes. The writer used to take the header from the keys of
 * whichever row arrived first; these lists say the same thing deliberately, and
 * `apps/cif2gtfs/test/build.spec.mts` is what holds them to it.
 *
 * Where a producer writes every column a file has, it references the schema's
 * own list rather than respelling it: there is nothing for it to decide, and two
 * identical lists are only an opportunity to stop being identical. What is
 * spelled out below is what this producer decided, and that is the point of
 * being able to read it.
 *
 * Two of those decisions are what trips.txt leaves out and what shapes.txt
 * leaves out. trips.txt does not declare `block_id` - a rail trip has no
 * vehicle block, because the DTD expresses the same idea as an association and
 * this feed writes that as a transfer. shapes.txt does not declare a
 * `shape_dist_traveled` worth reading, for the reason in `Shapes.ts`.
 * transfers.txt does declare all eighteen, including the twelve producer
 * extensions carrying what the DTD says about a fixed link, which a bus feed's
 * four-column transfers.txt does not.
 */
export const AGENCY = fileSchema<AgencyRow>("agency.txt", GTFS_COLUMNS["agency.txt"]);

export const ATTRIBUTIONS =
  fileSchema<AttributionRow>("attributions.txt", GTFS_COLUMNS["attributions.txt"]);

export const CALENDAR = fileSchema<CalendarRow>("calendar.txt", GTFS_COLUMNS["calendar.txt"]);

export const CALENDAR_DATES =
  fileSchema<CalendarDateRow>("calendar_dates.txt", GTFS_COLUMNS["calendar_dates.txt"]);

export const FEED_INFO = fileSchema<FeedInfoRow>("feed_info.txt", GTFS_COLUMNS["feed_info.txt"]);

export const LINKS = fileSchema<FixedLinkRow>("links.txt", GTFS_COLUMNS["links.txt"]);

export const ROUTES = fileSchema<RouteRow>("routes.txt", GTFS_COLUMNS["routes.txt"]);

export const STOP_TIMES =
  fileSchema<StopTimeRow>("stop_times.txt", GTFS_COLUMNS["stop_times.txt"]);

// Its own: the coordinates go last, and in that order, which is what this feed
// has always written.
export const STOPS = fileSchema<StopRow>("stops.txt", [
  "stop_id", "stop_code", "stop_name", "stop_desc", "zone_id", "stop_url", "location_type",
  "parent_station", "platform_code", "stop_timezone", "wheelchair_boarding", "stop_lon", "stop_lat"
]);

// Its own: all eighteen, the last twelve being what the DTD says about a fixed
// link and GTFS has no field for.
export const TRANSFERS = fileSchema<TransferRow>("transfers.txt", [
  "from_stop_id", "to_stop_id", "from_trip_id", "to_trip_id", "transfer_type", "min_transfer_time",
  "mode", "start_time", "end_time", "start_date", "end_date", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday", "sunday"
]);

export const SHAPES = fileSchema<ShapeRow>("shapes.txt", GTFS_COLUMNS["shapes.txt"]);

// Its own: no block_id, because a train has none.
export const TRIPS = fileSchema<TripRow>("trips.txt", [
  "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name", "direction_id",
  "wheelchair_accessible", "bikes_allowed", "shape_id"
]);
