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
 * previous service day instead. The exception is a train running in the second pass of the hour the
 * autumn change repeats, which `runsInTheRepeatedHour` describes.
 *
 * Each schedule is replaced rather than joined by a second one, so the copy keeps the id the
 * original was handed and no caller needs to supply a new one.
 */
export function shiftLateNightServices(schedules: Schedule[]): Schedule[] {
  const result: Schedule[] = [];

  for (const schedule of schedules) {
    // a schedule with no stop times has no departure to shift, and will be dropped before
    // any trip is written
    if (schedule.stopTimes.length === 0) {
      result.push(schedule);
      continue;
    }

    if (isLateNight(schedule)) {
      result.push(schedule.copyToPreviousServiceDay());
    } else {
      result.push(schedule);
    }
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

/**
 * The trains that run in the second pass of an hour the clocks repeat, and so must not be moved.
 *
 * On the last Sunday of October 01:00 to 01:59 happens twice, once in BST and again in GMT. The
 * shift reads a departure time as the first pass, which is right for a service day that ends before
 * the change, and wrong for one that runs straight through it: 01:05 GMT is 26:05 of the Saturday
 * service day, not 25:05, and telling it as 25:05 puts it alongside the train that already ran an
 * hour earlier.
 *
 * Nothing in the CIF says which pass a schedule means, so it is recognised by the shape the operator
 * publishes it in. The London Overground night service is the only one in Great Britain that runs
 * through the change, and it covers the repeated hour with short term plan schedules dated to that
 * Sunday alone - four in each direction between Highbury & Islington and New Cross Gate. The
 * standard schedules run in the first pass and are shifted as usual.
 *
 * Restricted to schedules departing between 01:00 and 01:59 because that is the repeated hour;
 * an 00:45 departure happens once whatever the clocks do.
 */
function runsInTheRepeatedHour(schedule: Schedule): boolean {
  if (schedule.operator !== LONDON_OVERGROUND || schedule.stp === STP.Permanent) {
    return false;
  }

  if (departureHour(schedule) !== 1) {
    return false;
  }

  const dates = schedule.calendar.runningDates();
  const first = dates.next();

  // the one day it runs, and no other, is the day the hour repeats
  return !first.done
    && dates.next().done === true
    && isLastSundayOfOctober(first.value);
}

function isLastSundayOfOctober(date: Temporal.PlainDate): boolean {
  return date.month === 10
    && dayOfWeek(date) === 0
    && date.day + 7 > date.daysInMonth;
}

function departureHour(schedule: Schedule): number {
  return parseInt(schedule.stopTimes[0].departure_time.substring(0, 2), 10);
}
