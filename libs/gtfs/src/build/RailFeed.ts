import {
  AgencyRow, AttributionRow, CalendarDateRow, CalendarRow, FeedInfoRow, FixedLinkRow, RouteRow,
  StopRow, StopTimeRow, TransferRow, TripRow, fileSchema
} from "@gb-transit/gtfs-schema";

/**
 * The files a GB rail feed writes, and the columns of each.
 *
 * Transcribed from the committed golden feed, which is the record of what this
 * repository publishes. The writer used to take the header from the keys of
 * whichever row arrived first; these lists say the same thing deliberately, and
 * `apps/cif2gtfs/src/build.spec.mts` is what holds them to it.
 *
 * Two absences are the point of the file. trips.txt does not declare `block_id`
 * or `shape_id` - a rail trip has neither, and a bus feed writing them from the
 * same TripRow does not put empty columns here. transfers.txt does declare all
 * eighteen, including the twelve producer extensions carrying what the DTD says
 * about a fixed link, which a bus feed's four-column transfers.txt does not.
 */
export const AGENCY = fileSchema<AgencyRow>("agency.txt", [
  "agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone",
  "agency_fare_url"
]);

export const ATTRIBUTIONS = fileSchema<AttributionRow>("attributions.txt", [
  "organization_name", "is_producer", "is_operator", "is_authority", "attribution_url",
  "attribution_licence"
]);

export const CALENDAR = fileSchema<CalendarRow>("calendar.txt", [
  "service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "start_date", "end_date"
]);

export const CALENDAR_DATES = fileSchema<CalendarDateRow>("calendar_dates.txt", [
  "service_id", "date", "exception_type"
]);

export const FEED_INFO = fileSchema<FeedInfoRow>("feed_info.txt", [
  "feed_publisher_name", "feed_publisher_url", "feed_lang", "feed_start_date", "feed_end_date",
  "feed_version"
]);

export const LINKS = fileSchema<FixedLinkRow>("links.txt", [
  "from_stop_id", "to_stop_id", "mode", "duration", "start_time", "end_time", "start_date",
  "end_date", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
]);

export const ROUTES = fileSchema<RouteRow>("routes.txt", [
  "route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_text_color",
  "route_color", "route_url", "route_desc"
]);

export const STOPS = fileSchema<StopRow>("stops.txt", [
  "stop_id", "stop_code", "stop_name", "stop_desc", "zone_id", "stop_url", "location_type",
  "parent_station", "platform_code", "stop_timezone", "wheelchair_boarding", "stop_lon", "stop_lat"
]);

export const STOP_TIMES = fileSchema<StopTimeRow>("stop_times.txt", [
  "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "stop_headsign",
  "pickup_type", "drop_off_type", "shape_dist_traveled", "timepoint"
]);

export const TRANSFERS = fileSchema<TransferRow>("transfers.txt", [
  "from_stop_id", "to_stop_id", "from_trip_id", "to_trip_id", "transfer_type", "min_transfer_time",
  "mode", "start_time", "end_time", "start_date", "end_date", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday", "sunday"
]);

export const TRIPS = fileSchema<TripRow>("trips.txt", [
  "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name", "direction_id",
  "wheelchair_accessible", "bikes_allowed"
]);
