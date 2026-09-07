import {
  AgencyRow, CalendarDateRow, CalendarRow, RouteRow, StopRow, StopTimeRow, TransferRow, TripRow,
  fileSchema
} from "@gb-transit/gtfs-schema";

/**
 * The files a merge writes, and the columns of each.
 *
 * The same row types the rail build writes, and mostly not the same columns:
 * trips.txt has no block_id or shape_id, stops.txt puts the coordinates where
 * this tool has always put them, and transfers.txt has six columns rather than
 * the rail feed's eighteen, because a merged feed has nothing to say about a
 * DTD fixed link.
 *
 * Two of these are wider than what gtfsmerge used to write, and both are for
 * the sake of merging a feed from this repository:
 *
 * `platform_code` on a stop, because that is how the rail feed says which
 * platform a boarding point is, and a merge that dropped it would quietly throw
 * that away.
 *
 * `from_trip_id` and `to_trip_id` on a transfer, because a transfer_type 4 is a
 * coupling between two named trips and without them the row means nothing. They
 * are remapped along with everything else - see StopsAndTransfersMerger.
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

export const STOPS = fileSchema<StopRow>("stops.txt", [
  "stop_id", "stop_code", "stop_name", "stop_desc", "stop_lat", "stop_lon", "zone_id", "stop_url",
  "location_type", "parent_station", "platform_code", "stop_timezone", "wheelchair_boarding"
]);

export const STOP_TIMES = fileSchema<StopTimeRow>("stop_times.txt", [
  "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "stop_headsign",
  "pickup_type", "drop_off_type", "shape_dist_traveled", "timepoint"
]);

export const TRANSFERS = fileSchema<TransferRow>("transfers.txt", [
  "from_stop_id", "to_stop_id", "from_trip_id", "to_trip_id", "transfer_type", "min_transfer_time"
]);

export const TRIPS = fileSchema<TripRow>("trips.txt", [
  "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name", "direction_id",
  "wheelchair_accessible", "bikes_allowed"
]);
