import {Schedule} from "../model/Schedule";

/**
 * Loop through every schedule and replace any early morning services with a copy on the previous day.
 *
 * GTFS specification defines "time" as starting from noon minus 12 hours, which is normally midnight
 * but may be different by 1 hour on the day when the summer time zone changes, in order to avoid
 * a DST change happening inside a service day.
 *
 * Therefore, trains which depart before the change on changeover days should be recorded as on the
 * previous service day instead.
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
    && parseInt(schedule.stopTimes[0].departure_time.substring(0, 2), 10) <= 1;
}
