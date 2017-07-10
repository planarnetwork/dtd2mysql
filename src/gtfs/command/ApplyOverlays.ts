
import {IdGenerator, OverlayRecord, STP} from "../native/OverlayRecord";
import {OverlapType} from "../native/ScheduleCalendar";

/**
 * Index the schedules by TUID, detect overlays and create new schedules as necessary.
 */
export function applyOverlays(schedules: OverlayRecord[]): OverlayIndex {
  const schedulesByTuid: OverlayIndex = {};
  const idGenerator = getIdGenerator(600000);

  for (const schedule of schedules) {
    // for all cancellation or overlays (perms don't overlap)
    if (schedule.stp !== STP.Permanent) {
      // get any schedules that share the same TUID
      for (const baseSchedule of schedulesByTuid[schedule.tuid] || []) {
        // remove the underlying schedule and add the replacement(s)
        schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid]
          .filter(s => s !== baseSchedule)
          .concat(applyOverlay(baseSchedule, schedule, idGenerator));
      }
    }

    // add the schedule to the index, unless it's a cancellation
    if (schedule.stp !== STP.Cancellation) {
      (schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid] || []).push(schedule);
    }
  }

  return schedulesByTuid;
}

/**
 * Return a Iterator that generates incremental numbers starting at the given number
 */
function *getIdGenerator(startId: number): IterableIterator<number> {
  let id = startId + 1;
  while (true) {
    yield id++;
  }
}

/**
 * Check if the given schedule overlaps the current one and if necessary divide this schedule into many others.
 *
 * If there is no overlap this Schedule will be returned intact.
 */
function applyOverlay(base: OverlayRecord, overlay: OverlayRecord, ids: IdGenerator): OverlayRecord[] {
  const overlap = base.calendar.getOverlap(overlay.calendar);

  // if this schedules schedule overlaps it at any point
  if (overlap === OverlapType.None) {
    return [base];
  }

  return overlap === OverlapType.Short
    ? base.calendar.addExcludeDays(overlay.calendar).map(calendar => base.clone(calendar, base.id))
    : base.calendar.divideAround(overlay.calendar).map(calendar => base.clone(calendar, ids.next().value));
}


export type OverlayIndex = {
  [tuid: string]: OverlayRecord[]
}