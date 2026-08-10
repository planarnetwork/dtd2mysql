import {ScheduleIndex} from "./ApplyAssociations";
import {Schedule} from "../model/Schedule";

/**
 * Flatten the index into a list of schedules, ensuring that there are no duplicate trip IDs
 */
export function mergeSchedules(schedulesByTuid: ScheduleIndex): Schedule[] {
  const schedulesByTripId = new Map<string, Schedule>();

  for (const schedules of Object.values(schedulesByTuid)) {
    for (const schedule of schedules) {
      let tripId = schedule.tripId;

      // the same two trains may be associated more than once over the same dates
      for (let occurrence = 2; schedulesByTripId.has(tripId); occurrence++) {
        tripId = `${schedule.tripId}_${occurrence}`;
      }

      schedulesByTripId.set(tripId, withTripId(schedule, tripId));
    }
  }

  return [...schedulesByTripId.values()];
}

/**
 * Point the schedule's stop times at the given trip ID so that stop_times.txt joins to trips.txt
 */
function withTripId(schedule: Schedule, tripId: string): Schedule {
  if (schedule.stopTimes.length === 0 || schedule.stopTimes[0].trip_id === tripId) {
    return schedule;
  }

  return new Schedule(
    schedule.id,
    schedule.stopTimes.map(st => Object.assign({}, st, { trip_id: tripId })),
    schedule.tuid,
    schedule.rsid,
    schedule.calendar,
    schedule.mode,
    schedule.operator,
    schedule.stp,
    schedule.firstClassAvailable,
    schedule.reservationPossible
  );
}
