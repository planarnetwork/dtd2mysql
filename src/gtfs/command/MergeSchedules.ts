import {ScheduleIndex} from "./ApplyAssociations";
import {Schedule} from "../native/Schedule";

/**
 * Flatten the index into a list of schedules, ensuring that there are no duplicate trip IDs
 */
export function mergeSchedules(schedulesByTuid: ScheduleIndex): Schedule[] {
  const schedulesByTripId: { [tripId: string]: Schedule } = {};

  for (const tuid in schedulesByTuid) {
    if (schedulesByTuid.hasOwnProperty(tuid)) {
      for (const schedule of schedulesByTuid[tuid]) {
        const tripId = schedule.tripId;
        if (schedulesByTripId[tripId] !== undefined) {
          throw new Error(`Duplicate trip_id ${tripId} detected. This should not happen. Please file a bug report.`);
        }
        if (schedule.stopTimes.length && schedule.stopTimes[0].trip_id !== tripId) {
          throw new Error(`The trip_id of the stop times do not match the trip_id for trip ${tripId}. This should not happen. Please file a bug report.`);
        }
        schedulesByTripId[tripId] = schedule;
      }
    }
  }

  return Object.values(schedulesByTripId);
}