import {AgencyRow} from "./Agency";
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
 */
export type FeedRow =
  AgencyRow
  | CalendarRow
  | CalendarDateRow
  | FeedInfoRow
  | FixedLinkRow
  | RouteRow
  | StopRow
  | StopTimeRow
  | TransferRow
  | TripRow;
