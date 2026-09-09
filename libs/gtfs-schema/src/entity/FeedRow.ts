import {AgencyRow} from "./Agency.js";
import {AreaRow, StopAreaRow} from "./Area.js";
import {AttributionRow} from "./Attribution.js";
import {CalendarRow} from "./Calendar.js";
import {CalendarDateRow} from "./CalendarDate.js";
import {FeedInfoRow} from "./FeedInfo.js";
import {FixedLinkRow} from "./FixedLink.js";
import {FrequencyRow} from "./Frequency.js";
import {RouteRow} from "./Route.js";
import {ShapeRow} from "./Shape.js";
import {StopRow} from "./Stop.js";
import {StopTimeRow} from "./StopTime.js";
import {TransferRow} from "./Transfer.js";
import {TripRow} from "./Trip.js";

/**
 * A row of a file this build writes, which is the list of files it writes.
 *
 * A model may know more than its file holds - a Stop knows its CRS, its TIPLOC
 * and whether the coordinate is the feed's, a StopTime knows its platform - so
 * what reaches the writer is a row rather than a model, and the projection
 * happens once, in the `toXRow` beside the model. Where a model is already
 * exactly its file, the row type says so.
 *
 * An extension's files are in here too, rather than extensions carrying a row
 * type of their own. The list stays the list of files the build can write, so
 * a column that does not exist still fails to compile, and the writer keeps one
 * type to sort.
 */
export type FeedRow =
  AgencyRow
  | AreaRow
  | AttributionRow
  | CalendarRow
  | CalendarDateRow
  | FeedInfoRow
  | FixedLinkRow
  | FrequencyRow
  | RouteRow
  | ShapeRow
  | StopRow
  | StopAreaRow
  | StopTimeRow
  | TransferRow
  | TripRow;
