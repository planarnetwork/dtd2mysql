import {Schedule} from "../model/Schedule";
import {STP} from "../model/OverlayRecord";
import {AgencyID} from "../entity/Agency";
import {dayOfWeek} from "../model/PlainDate";

/**
 * Loop through every schedule and replace any early morning services with a copy on the previous day.
 *
 * GTFS specification defines "time" as starting from noon minus 12 hours, which is normally midnight
 * but may be different by 1 hour on the day when the summer time zone changes, in order to avoid
 * a DST change happening inside a service day.
 *
 * Therefore, trains which depart before the change on changeover days should be recorded as on the
 * previous service day instead, unless they run in the hour the autumn change repeats - see
 * `runsInTheRepeatedHour`.
 *
 * Each schedule is replaced rather than joined by a second one, so the copy keeps the id the
 * original was handed and no caller needs to supply a new one.
 */
export function shiftLateNightServices(schedules: Schedule[]): Schedule[] {
  const result: Schedule[] = [];
  let exempt = 0;

  for (const schedule of schedules) {
    if (isLateNight(schedule)) {
      result.push(schedule.copyToPreviousServiceDay());
      continue;
    }

    result.push(schedule);

    if (runsInTheRepeatedHour(schedule)) {
      exempt++;
    }
  }

  // Once a year, and expected to stop matching whenever the operator changes how it publishes these,
  // so it says so rather than leaving the answer to a diff of two feeds.
  if (exempt > 0) {
    console.log(`Keeping ${exempt} schedules in the repeated hour of the autumn clock change`);
  }

  return result;
}

/**
 * Whether this is one of the services that gets moved onto the previous day.
 */
export function isLateNight(schedule: Schedule): boolean {
  return schedule.stopTimes.length > 0
    && departureHour(schedule) <= 1
    && !runsInTheRepeatedHour(schedule);
}

const LONDON_OVERGROUND: AgencyID = "LO";
const WINDRUSH = "WIN";

/**
 * Whether this train runs in the second pass of the hour the autumn change repeats, and so stays on
 * the day its own record dates it.
 *
 * On the last Sunday of October 01:00 to 01:59 happens twice, in BST and again in GMT. The shift
 * reads a departure as the first pass, which is right for a service day ending before the change and
 * wrong for one running through it: 01:05 GMT is 26:05 of the Saturday service day, and telling it
 * as 25:05 puts it alongside the train that already ran an hour earlier.
 *
 * Nothing in the CIF says which pass a schedule means, so it is recognised by the shape London
 * Overground publishes the Windrush night service in - the only one in Great Britain running through
 * the change. It covers the repeated hour with short term plan schedules dated to that Sunday alone,
 * four in each direction between Highbury & Islington and New Cross Gate; the standard schedules
 * cover the first pass and are shifted as usual. Those schedules also carry signalling IDs starting
 * `9Z`, which is not read here because the CIF headcode does not reach `Schedule` - see the TODO on
 * `Schedule.bareRouteId`.
 *
 * The dates are the record's own rather than the days it is left running: `applyOverlays` adds
 * exclude days without moving the range, so a wide record whittled down to that Sunday by a
 * higher-priority overlay is not one the operator dated to it.
 *
 * Ordered cheapest first - `routeId` walks the calls to recognise the line, so it is asked last.
 */
function runsInTheRepeatedHour(schedule: Schedule): boolean {
  return schedule.stopTimes.length > 0
    && schedule.operator === LONDON_OVERGROUND
    && schedule.stp !== STP.Permanent
    && departureHour(schedule) === 1
    && schedule.calendar.runsFrom.equals(schedule.calendar.runsTo)
    && isLastSundayOfOctober(schedule.calendar.runsFrom)
    && schedule.routeId === WINDRUSH;
}

/**
 * A Sunday in October with no Sunday left after it, which is the 31st in 2027 and the 25th in 2026.
 */
function isLastSundayOfOctober(date: Temporal.PlainDate): boolean {
  return date.month === 10
    && dayOfWeek(date) === 0
    && date.day + 7 > date.daysInMonth;
}

function departureHour(schedule: Schedule): number {
  return parseInt(schedule.stopTimes[0].departure_time.substring(0, 2), 10);
}
