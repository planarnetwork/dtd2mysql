import {AgencyRow} from "./Agency";
import {AreaRow, StopAreaRow} from "./Area";
import {CalendarRow} from "./Calendar";
import {CalendarDateRow} from "./CalendarDate";
import {FeedInfoRow} from "./FeedInfo";
import {FixedLinkRow} from "./FixedLink";
import {RouteRow} from "./Route";
import {StopRow} from "./Stop";
import {StopTimeRow} from "./StopTime";
import {TransferRow} from "./Transfer";
import {TripRow} from "./Trip";

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
  | CalendarRow
  | CalendarDateRow
  | FeedInfoRow
  | FixedLinkRow
  | RouteRow
  | StopRow
  | StopAreaRow
  | StopTimeRow
  | TransferRow
  | TripRow;
