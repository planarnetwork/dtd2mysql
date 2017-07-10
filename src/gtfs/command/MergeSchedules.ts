import {OverlayRecord} from "../native/OverlayRecord";
import {Schedule} from "../native/Schedule";
import {OverlayIndex} from "./ApplyOverlays";

/**
 * Flatten the index into a list of schedules, detecting any schedules that can be merged in the process.
 */
export function mergeSchedules(schedulesByTuid: OverlayIndex): OverlayRecord[] {
  const results: OverlayRecord[] = [];

  for (const tuid in schedulesByTuid) {
    // group schedules that run on the same days with the exact same stopping pattern
    const schedulesByHash: OverlayIndex = schedulesByTuid[tuid].reduce((prev, cur) => {
      (prev[cur.hash] = prev[cur.hash] || []).push(cur);

      return prev;
    }, {});

    // for each group of schedules that might be merged
    for (const groupedSchedules of Object.values(schedulesByHash)) {
      // sortSchedules by start date
      groupedSchedules.sort(sortOverlays);

      // iterate through each schedule
      for (let i = 0; i < groupedSchedules.length; i++) {
        let scheduleI = groupedSchedules[i];

        // merge as many schedules in as possible
        while (groupedSchedules[i + 1] && scheduleI.calendar.canMerge(groupedSchedules[i + 1].calendar)) {
          scheduleI = scheduleI.clone(scheduleI.calendar.merge(groupedSchedules[++i].calendar), scheduleI.id);
        }

        results.push(scheduleI);
      }
    }
  }

  return results;
}

function sortOverlays(a: Schedule, b: Schedule): number {
  return a.calendar.runsFrom.isSameOrBefore(b.calendar.runsFrom) ? -1 : 1;
}