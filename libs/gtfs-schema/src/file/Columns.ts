import {AgencyRow} from "../entity/Agency.js";
import {AreaRow, StopAreaRow} from "../entity/Area.js";
import {AttributionRow} from "../entity/Attribution.js";
import {CalendarRow} from "../entity/Calendar.js";
import {CalendarDateRow} from "../entity/CalendarDate.js";
import {FeedInfoRow} from "../entity/FeedInfo.js";
import {FixedLinkRow} from "../entity/FixedLink.js";
import {FrequencyRow} from "../entity/Frequency.js";
import {RouteRow} from "../entity/Route.js";
import {ShapeRow} from "../entity/Shape.js";
import {StopRow} from "../entity/Stop.js";
import {StopTimeRow} from "../entity/StopTime.js";
import {TransferRow} from "../entity/Transfer.js";
import {TripRow} from "../entity/Trip.js";

/**
 * The columns of one file, in the order they are written.
 *
 * A producer declares this; the writer does not infer it from a row. Two
 * producers write the same file with different columns - a rail feed's trip has
 * no shape_id and a bus feed's transfer has no mode - and a header taken from
 * whichever row happened to arrive first cannot express that. It is also the
 * only way a file with no rows can have a header at all.
 *
 * `Extract<keyof R, string>` is the whole contract: a column that is not a field
 * of the row type does not compile.
 */
export type Columns<R extends object> = readonly (Extract<keyof R, string>)[];

/**
 * A file, and the columns of it a producer writes.
 */
export interface FileSchema<R extends object> {
  readonly filename: string;
  readonly columns: Columns<R>;
}

/**
 * Declare a file and its columns.
 *
 * The row type is given rather than inferred, so `fileSchema<TripRow>(...)`
 * checks the names against `TripRow` and `fileSchema<StopRow>(...)` against
 * `StopRow`. Getting the type parameter wrong is itself a compile error, because
 * the names will not be fields of it.
 */
export function fileSchema<R extends object>(filename: string, columns: Columns<R>): FileSchema<R> {
  return {filename, columns};
}

/**
 * Every column each file may carry, in the canonical order.
 *
 * A producer picks the subset it writes. These lists are the union of what the
 * producers in this repository write, which for the files a GB rail feed
 * publishes is exactly the header those files already have - the order is
 * transcribed from the committed golden feed, so declaring a file's full set
 * reproduces it byte for byte.
 *
 * A reader wanting to know what a column could be called reads this; it is not
 * the GTFS spec's full vocabulary and does not claim to be.
 */
export const GTFS_COLUMNS = {
  "agency.txt": [
    "agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone",
    "agency_fare_url"
  ] satisfies Columns<AgencyRow>,

  "areas.txt": ["area_id", "area_name"] satisfies Columns<AreaRow>,

  "attributions.txt": [
    "organization_name", "is_producer", "is_operator", "is_authority", "attribution_url",
    "attribution_licence"
  ] satisfies Columns<AttributionRow>,

  "calendar.txt": [
    "service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "start_date", "end_date"
  ] satisfies Columns<CalendarRow>,

  "calendar_dates.txt": ["service_id", "date", "exception_type"] satisfies Columns<CalendarDateRow>,

  "feed_info.txt": [
    "feed_publisher_name", "feed_publisher_url", "feed_lang", "feed_start_date", "feed_end_date",
    "feed_version"
  ] satisfies Columns<FeedInfoRow>,

  // This repository's own file, not a GTFS one: a fixed link the rail feed
  // publishes alongside transfers.txt.
  "frequencies.txt": [
    "trip_id", "start_time", "end_time", "headway_secs", "exact_times"
  ] satisfies Columns<FrequencyRow>,

  "links.txt": [
    "from_stop_id", "to_stop_id", "mode", "duration", "start_time", "end_time", "start_date",
    "end_date", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ] satisfies Columns<FixedLinkRow>,

  "routes.txt": [
    "route_id", "agency_id", "route_short_name", "route_long_name", "route_type",
    "route_text_color", "route_color", "route_url", "route_desc"
  ] satisfies Columns<RouteRow>,

  "shapes.txt": [
    "shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence", "shape_dist_traveled"
  ] satisfies Columns<ShapeRow>,

  "stop_areas.txt": ["area_id", "stop_id"] satisfies Columns<StopAreaRow>,

  // stop_lon and stop_lat last, and in that order: this is what the rail feed
  // has always written, and the golden is the record of it.
  "stops.txt": [
    "stop_id", "stop_code", "stop_name", "stop_desc", "zone_id", "stop_url", "location_type",
    "parent_station", "platform_code", "stop_timezone", "wheelchair_boarding", "stop_lon", "stop_lat"
  ] satisfies Columns<StopRow>,

  "stop_times.txt": [
    "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "stop_headsign",
    "pickup_type", "drop_off_type", "shape_dist_traveled", "timepoint"
  ] satisfies Columns<StopTimeRow>,

  // The twelve columns after min_transfer_time are producer extensions carrying
  // what the DTD says about a fixed link. A producer with nothing to say about
  // one declares the first six and writes a standard file.
  "transfers.txt": [
    "from_stop_id", "to_stop_id", "from_trip_id", "to_trip_id", "transfer_type",
    "min_transfer_time", "mode", "start_time", "end_time", "start_date", "end_date", "monday",
    "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ] satisfies Columns<TransferRow>,

  "trips.txt": [
    "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name", "direction_id",
    "wheelchair_accessible", "bikes_allowed", "block_id", "shape_id"
  ] satisfies Columns<TripRow>
} as const;

/**
 * A file this repository knows the columns of.
 */
export type GTFSFileName = keyof typeof GTFS_COLUMNS;

/**
 * A column of the named file.
 */
export type GTFSColumn<F extends GTFSFileName> = (typeof GTFS_COLUMNS)[F][number];
