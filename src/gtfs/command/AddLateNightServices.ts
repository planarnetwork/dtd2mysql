import {Schedule} from "../native/Schedule";
import {IdGenerator} from "../native/OverlayRecord";

/**
 * Loop through every schedule and add a copy of any early morning services to the previous day.
 */
export function addLateNightServices(schedules: Schedule[], idGenerator: IdGenerator): Schedule[] {
  const result: Schedule[] = [];

  for (const schedule of schedules) {
    result.push(schedule);
    const departureHour = parseInt(schedule.stopTimes[0].departure_time.substr(0, 2), 10);

    if (departureHour <= 3) {
      for (const stop of schedule.stopTimes) {
        stop.departure_time = (parseInt(stop.departure_time.substr(0, 2), 10) + 24) + stop.departure_time.substr(2);
        stop.arrival_time = (parseInt(stop.arrival_time.substr(0, 2), 10) + 24) + stop.arrival_time.substr(2);
      }

      result.push(schedule.clone(schedule.calendar.shiftBackward(), idGenerator.next().value));
    }
  }

  return result;
}