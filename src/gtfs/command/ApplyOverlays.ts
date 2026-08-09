import {OverlayRecord, STP} from "../native/OverlayRecord";
import {OverlapType} from "../native/ScheduleCalendar";

/**
 * Index the schedules by TUID, detect overlays and create new schedules as necessary.
 */
export function applyOverlays<T extends OverlayRecord>(schedules: T[]): OverlayIndex<T> {
  const schedulesByTuid: OverlayIndex<T> = {};

  for (const schedule of schedules) {
    // permanent records are applied as overlays too - z_schedule is entirely permanent and its
    // records do overlap each other
    for (const baseSchedule of schedulesByTuid[schedule.tuid] || []) {
      // remove the underlying schedule and add the replacement
      const overlay = applyOverlay(baseSchedule, schedule);
      schedulesByTuid[schedule.tuid].splice(
        schedulesByTuid[schedule.tuid].indexOf(baseSchedule), 1, ...overlay === null ? [] : [overlay]
      );
    }

    // add the schedule to the index, unless it's a cancellation
    if (schedule.stp !== STP.Cancellation) {
      (schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid] || []).push(schedule);
    }
  }

  return schedulesByTuid;
}

/**
 * Check if the given schedule overlaps the current one and if necessary add exclude days to this schedule.
 *
 * If there is no overlap this Schedule will be returned intact.
 */
function applyOverlay<T extends OverlayRecord>(base: T, overlay: T): T | null {
  const overlap = base.calendar.getOverlap(overlay.calendar);

  // if this schedules schedule overlaps it at any point
  if (overlap === OverlapType.None) {
    return base;
  }

  const newCalendar = base.calendar.addExcludeDays(overlay.calendar);

  return newCalendar === null ? null : base.clone(newCalendar, base.id) as T;
}


export type OverlayIndex<T extends OverlayRecord> = {
  [tuid: string]: T[]
}