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
    for (const schedule of [...schedulesByTuid[tuid]].sort(byContent)) {
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
 * An order over two schedules that says nothing about where they came from.
 *
 * `Schedule.id` cannot be used: it is the row number the source gave the record,
 * and the database and the files number them differently.
 */
function byContent(a: Schedule, b: Schedule): number {
  const left = content(a);
  const right = content(b);

  return left < right ? -1 : left > right ? 1 : 0;
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
