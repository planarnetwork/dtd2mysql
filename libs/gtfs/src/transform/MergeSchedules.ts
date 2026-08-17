import {ScheduleIndex} from "./ApplyAssociations";
import {Schedule} from "../model/Schedule";

/**
 * Flatten the index into a list of schedules, ensuring that there are no duplicate trip IDs.
 *
 * Two schedules can want the same trip ID - the same pair of trains associated
 * more than once over the same dates - and one of them has to take a suffix.
 * Which one cannot be decided by whichever arrived first, or the same timetable
 * would be numbered differently depending on the source, so both the TUIDs and
 * the schedules within a TUID are walked in an order taken from their content.
 */
export function mergeSchedules(schedulesByTuid: ScheduleIndex): Schedule[] {
  const schedulesByTripId = new Map<string, Schedule>();

  for (const tuid of Object.keys(schedulesByTuid).sort()) {
    for (const schedule of inContentOrder(schedulesByTuid[tuid])) {
      let tripId = schedule.tripId;

      for (let occurrence = 2; schedulesByTripId.has(tripId); occurrence++) {
        tripId = `${schedule.tripId}_${occurrence}`;
      }

      schedulesByTripId.set(tripId, withTripId(schedule, tripId));
    }
  }

  return [...schedulesByTripId.values()];
}

/**
 * The schedules of one TUID, ordered by what is in them.
 *
 * `Schedule.id` cannot order them: it is the row number the source gave the
 * record, and the database and the files number them differently. The key holds
 * every stop time, so it is built once per schedule rather than once per
 * comparison, and only where there is more than one schedule to order - which
 * for most TUIDs there is not.
 */
function inContentOrder(schedules: Schedule[]): Schedule[] {
  if (schedules.length < 2) {
    return schedules;
  }

  return schedules
    .map(schedule => ({schedule, key: content(schedule)}))
    .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    .map(({schedule}) => schedule);
}

function content(schedule: Schedule): string {
  return [
    schedule.calendar.id,
    schedule.stp,
    schedule.operator ?? "",
    schedule.mode,
    schedule.firstClassAvailable,
    schedule.reservationPossible,
    schedule.stopTimes.map(s =>
      [s.stop_id, s.stop_sequence, s.arrival_time, s.departure_time, s.pickup_type, s.drop_off_type].join(":")
    ).join(",")
  ].join("|");
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
