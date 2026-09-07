import {
  AgencyRow, CalendarDateRow, CalendarRow, GTFS_COLUMNS, RouteRow, ShapeRow, StopRow, StopTimeRow,
  TransferRow, TripRow, fileSchema
} from "@gb-transit/gtfs-schema";

/**
 * The files a TransXChange conversion writes, and the columns of each.
 *
 * Where every column a file has is written, the schema's own list is referenced
 * rather than respelled. What is spelled out below is what this producer
 * decided.
 *
 * There is no feed_info.txt at all. TransXChange carries nothing to build one
 * from, and inventing a publisher and a version would be worse than the
 * validator warning about its absence.
 */
export const AGENCY = fileSchema<AgencyRow>("agency.txt", GTFS_COLUMNS["agency.txt"]);

export const CALENDAR = fileSchema<CalendarRow>("calendar.txt", GTFS_COLUMNS["calendar.txt"]);

export const CALENDAR_DATES =
  fileSchema<CalendarDateRow>("calendar_dates.txt", GTFS_COLUMNS["calendar_dates.txt"]);

export const ROUTES = fileSchema<RouteRow>("routes.txt", GTFS_COLUMNS["routes.txt"]);

export const SHAPES = fileSchema<ShapeRow>("shapes.txt", GTFS_COLUMNS["shapes.txt"]);

export const STOP_TIMES =
  fileSchema<StopTimeRow>("stop_times.txt", GTFS_COLUMNS["stop_times.txt"]);

// Its own: the coordinates where this tool has always put them, and no
// platform_code - a TransXChange stop has no platform to name.
export const STOPS = fileSchema<StopRow>("stops.txt", [
  "stop_id", "stop_code", "stop_name", "stop_desc", "stop_lat", "stop_lon", "zone_id", "stop_url",
  "location_type", "parent_station", "stop_timezone", "wheelchair_boarding"
]);

// Its own: four columns, because there is no DTD fixed link to describe and no
// coupling to name trips for.
export const TRANSFERS = fileSchema<TransferRow>("transfers.txt", [
  "from_stop_id", "to_stop_id", "transfer_type", "min_transfer_time"
]);

// Its own: with block_id and shape_id, which a train has neither of.
export const TRIPS = fileSchema<TripRow>("trips.txt", [
  "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name", "direction_id",
  "wheelchair_accessible", "bikes_allowed", "block_id", "shape_id"
]);
