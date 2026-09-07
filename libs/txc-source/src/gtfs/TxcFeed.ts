import {
  AgencyRow, CalendarDateRow, CalendarRow, RouteRow, ShapeRow, StopRow, StopTimeRow, TransferRow,
  TripRow, fileSchema
} from "@gb-transit/gtfs-schema";

/**
 * The files a TransXChange conversion writes, and the columns of each.
 *
 * Same row types as the rail build, different columns. trips.txt has block_id
 * and shape_id, which a train has neither of; transfers.txt has four columns
 * rather than eighteen, because there is no DTD fixed link to describe; stops.txt
 * puts the coordinates where this tool has always put them and writes no
 * platform_code.
 *
 * There is no feed_info.txt. TransXChange carries nothing to build one from, and
 * inventing a publisher and a version would be worse than the validator warning.
 */
export const AGENCY = fileSchema<AgencyRow>("agency.txt", [
  "agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone",
  "agency_fare_url"
]);

export const CALENDAR = fileSchema<CalendarRow>("calendar.txt", [
  "service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "start_date", "end_date"
]);

export const CALENDAR_DATES = fileSchema<CalendarDateRow>("calendar_dates.txt", [
  "service_id", "date", "exception_type"
]);

export const ROUTES = fileSchema<RouteRow>("routes.txt", [
  "route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_text_color",
  "route_color", "route_url", "route_desc"
]);

export const SHAPES = fileSchema<ShapeRow>("shapes.txt", [
  "shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence", "shape_dist_traveled"
]);

export const STOPS = fileSchema<StopRow>("stops.txt", [
  "stop_id", "stop_code", "stop_name", "stop_desc", "stop_lat", "stop_lon", "zone_id", "stop_url",
  "location_type", "parent_station", "stop_timezone", "wheelchair_boarding"
]);

export const STOP_TIMES = fileSchema<StopTimeRow>("stop_times.txt", [
  "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "stop_headsign",
  "pickup_type", "drop_off_type", "shape_dist_traveled", "timepoint"
]);

export const TRANSFERS = fileSchema<TransferRow>("transfers.txt", [
  "from_stop_id", "to_stop_id", "transfer_type", "min_transfer_time"
]);

export const TRIPS = fileSchema<TripRow>("trips.txt", [
  "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name", "direction_id",
  "wheelchair_accessible", "bikes_allowed", "block_id", "shape_id"
]);
