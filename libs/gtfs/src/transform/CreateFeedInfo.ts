import {FeedInfo} from "../entity/FeedInfo";
import {Calendar} from "../entity/Calendar";
import {CalendarDate} from "../entity/CalendarDate";
import {DateRange} from "../build/BuildContext";
import {toYYYYMMDD} from "../model/PlainDate";

const PUBLISHER = "Planar Network";
const PUBLISHER_URL = "https://github.com/planarnetwork/dtd2mysql";

/**
 * What the feed can be trusted for, which is neither the window that was asked
 * for nor the span of the calendars that came back.
 *
 * GTFS defines these as the first and last day the feed provides *complete*
 * information for, and both ends can lie in a different direction:
 *
 * - the earliest calendar start is often years in the past, because a schedule
 *   that began in 2021 and still runs is emitted with its real start date. The
 *   feed does not describe 2021 - services that ended before the build date were
 *   never queried - so the honest start is the build date.
 * - the latest calendar end is often 2099, for the same reason in reverse. The
 *   feed only knows about services live inside the window, so anything past the
 *   end of it is unverified.
 *
 * So it is the window, with the end pulled in when the data runs out first,
 * which is the only case where the calendars have anything to say.
 */
export function createFeedInfo(
  calendars: Calendar[],
  calendarDates: CalendarDate[],
  range: DateRange,
  version: string | null
): FeedInfo {
  const from = toYYYYMMDD(range.from);
  const to = toYYYYMMDD(range.to);

  const covered = calendars
    .map(calendar => calendar.end_date)
    .concat(calendarDates.filter(date => date.exception_type === 1).map(date => date.date))
    .filter(date => !!date);

  const last = covered.length > 0 ? covered.reduce((a, b) => a > b ? a : b) : from;

  return {
    feed_publisher_name: PUBLISHER,
    feed_publisher_url: PUBLISHER_URL,
    feed_lang: "en",
    feed_start_date: from,
    feed_end_date: last < to ? last : to,
    feed_version: version
  };
}
