import type {Temporal} from "temporal-polyfill";
import {Schedule} from "../model/Schedule";
import {STP} from "../model/OverlayRecord";
import {AgencyID, dayOfWeek} from "@gb-transit/gtfs-schema";

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

  // fires once a year, and stops matching if the operator changes how it publishes these
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
 * Whether this train runs in the second pass of the hour the clocks repeat, which the shift would
 * publish an hour before it happens.
 *
 * The CIF does not say which pass a schedule means, so it is taken from the shape London Overground
 * publishes the Windrush night service in: new schedules dated to that Sunday alone. The 9Z
 * signalling IDs #165 names would say it directly, but the headcode does not reach `Schedule`.
 *
 * New rather than any short term plan record, because an overlay dated to that Sunday is how the
 * BST departure already in the timetable gets retimed by a minute or two. That train is the first
 * pass and still moves back a day.
 *
 * The dates are the record's own, not the days it is left running - `applyOverlays` excludes days
 * without moving the range, so a wide record can be narrowed onto that Sunday without being dated
 * to it.
 */
function runsInTheRepeatedHour(schedule: Schedule): boolean {
  return schedule.stopTimes.length > 0
    && schedule.operator === LONDON_OVERGROUND
    && schedule.stp === STP.New
    && departureHour(schedule) === 1
    && schedule.calendar.runsFrom.equals(schedule.calendar.runsTo)
    && isLastSundayOfOctober(schedule.calendar.runsFrom)
    && schedule.routeId === WINDRUSH;
}

/** A Sunday with no Sunday left after it: the 25th in 2026, the 31st in 2027. */
function isLastSundayOfOctober(date: Temporal.PlainDate): boolean {
  return date.month === 10
    && dayOfWeek(date) === 0
    && date.day + 7 > date.daysInMonth;
}

function departureHour(schedule: Schedule): number {
  return parseInt(schedule.stopTimes[0].departure_time.substring(0, 2), 10);
}
