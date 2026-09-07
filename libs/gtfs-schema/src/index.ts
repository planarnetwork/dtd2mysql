// GTFS entities - the shape of each output file
export type {Agency, AgencyID, AgencyRow} from "./entity/Agency.js";
export type {Area, AreaID, AreaRow, StopArea, StopAreaRow} from "./entity/Area.js";
export type {AttributionRole, AttributionRow} from "./entity/Attribution.js";
export type {Calendar, CalendarRow} from "./entity/Calendar.js";
export type {CalendarDate, CalendarDateRow} from "./entity/CalendarDate.js";
export type {FixedLink, FixedLinkRow} from "./entity/FixedLink.js";
export {RouteType} from "./entity/Route.js";
export type {Route, RouteID, RouteRow} from "./entity/Route.js";
export type {Shape, ShapeID, ShapeRow} from "./entity/Shape.js";
export type {Stop, StopRow, CRS, TIPLOC} from "./entity/Stop.js";
export {PickupDropOffType} from "./entity/StopTime.js";
export type {StopTime, StopTimeRow, Platform} from "./entity/StopTime.js";
export {TransferType} from "./entity/Transfer.js";
export type {Transfer, TransferRow, StopID} from "./entity/Transfer.js";
export type {Trip, TripRow} from "./entity/Trip.js";
export type {FeedInfo, FeedInfoRow} from "./entity/FeedInfo.js";
export type {FeedRow} from "./entity/FeedRow.js";

// The files a feed is made of: which columns each may carry, and where a
// producer puts the rows it writes
export {fileSchema, GTFS_COLUMNS} from "./file/Columns.js";
export type {Columns, FileSchema, GTFSColumn, GTFSFileName} from "./file/Columns.js";
export type {GTFSOutput, RowWriter} from "./file/GTFSOutput.js";

// The identifiers a CIF record carries onto the rows built from it
export type {RSID, TUID} from "./model/Identifiers.js";

// The scalars the entities are written in
export {SECONDS_IN_DAY, formatDuration, parseDuration} from "./model/Duration.js";
export type {Duration} from "./model/Duration.js";
export {compare, dayOfWeek, maxDate, minDate, toYYYYMMDD} from "./model/PlainDate.js";
// From its own module rather than through PlainDate: the numbering is a plain union and does not
// need the Temporal-typed declarations that turn a date into one.
export type {DayOfWeek} from "./model/DayOfWeek.js";
