import {Schedule} from "../native/Schedule";
import {IdGenerator} from "../native/OverlayRecord";

/**
 * Loop through every schedule and replace any early morning services with a copy on the previous day.
 *
 * GTFS specification defines "time" as starting from noon minus 12 hours, which is normally midnight
 * but may be different by 1 hour on the day when the summer time zone changes, in order to avoid
 * a DST change happening inside a service day.
 *
 * Therefore, trains which depart before the change on changeover days should be recorded as on the
 * previous service day instead.
 */
export function addLateNightServices(schedules: Schedule[], idGenerator: IdGenerator): Schedule[] {
  const result: Schedule[] = [];

  for (const schedule of schedules) {
    const departureHour = parseInt(schedule.stopTimes[0].departure_time.substr(0, 2), 10);

    if (departureHour <= 1) {
      const newSchedule = schedule.clone(schedule.calendar.shiftBackward(), idGenerator.next().value);

      for (const stop of newSchedule.stopTimes) {
        stop.departure_time = (parseInt(stop.departure_time.substr(0, 2), 10) + 24) + stop.departure_time.substr(2);
        stop.arrival_time = (parseInt(stop.arrival_time.substr(0, 2), 10) + 24) + stop.arrival_time.substr(2);
      }

      result.push(newSchedule);
    } else {
      result.push(schedule);
    }
  }

  return result;
}