import {IdGenerator, OverlayRecord, STP} from "../native/OverlayRecord";
import {OverlapType} from "../native/ScheduleCalendar";

/**
 * Index the schedules by TUID, detect overlays and create new schedules as necessary.
 */
export function applyOverlays<T extends OverlayRecord>(schedules: T[], idGenerator: IdGenerator = getDefaultIdGenerator()): OverlayIndex<T> {
  const schedulesByTuid: OverlayIndex<T> = {};

  for (const schedule of schedules) {
    // for all cancellation or overlays (perms don't overlap)
    if (schedule.stp !== STP.Permanent) {
      // get any schedules that share the same TUID
      for (const baseSchedule of schedulesByTuid[schedule.tuid] || []) {
        // remove the underlying schedule and add the replacement(s)
        const overlay = applyOverlay(baseSchedule, schedule, idGenerator);
        schedulesByTuid[schedule.tuid].splice(
          schedulesByTuid[schedule.tuid].indexOf(baseSchedule), 1, ...overlay === null ? [] : [overlay]
        );
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
function *getDefaultIdGenerator(): IterableIterator<number> {
  let id = 0;
  while (true) {
    yield id++;
  }
}

/**
 * Check if the given schedule overlaps the current one and if necessary add exclude days to this schedule.
 *
 * If there is no overlap this Schedule will be returned intact.
 */
function applyOverlay<T extends OverlayRecord>(base: T, overlay: T, ids: IdGenerator): T | null {
  const overlap = base.calendar.getOverlap(overlay.calendar);

  // if this schedules schedule overlaps it at any point
  if (overlap === OverlapType.None) {
    return base;
  }

  const newCalendar = base.calendar.addExcludeDays(overlay.calendar);

  return newCalendar === null ? null : base.clone(newCalendar, base.id);
}


export type OverlayIndex<T extends OverlayRecord> = {
  [tuid: string]: T[]
}