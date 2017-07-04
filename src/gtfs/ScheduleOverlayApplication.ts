
import {Schedule, STP} from "./native/Schedule";

export class ScheduleOverlayApplication {

  /**
   * Index the schedules by TUID, detect overlays and create new schedules as necessary.
   */
  public static processSchedules(schedules: Schedule[]): Schedule[] {
    const scheduleByTuid: ScheduleIndex = {};
    const idGenerator = this.getIdGenerator(schedules[schedules.length -1].id);

    for (const schedule of schedules) {
      // for all cancellation or overlays (perms don't overlap)
      if (schedule.stp !== STP.Permanent) {
        // get any schedules that share the same TUID
        for (const scheduleJ of scheduleByTuid[schedule.tuid] || []) {
          // remove the underlying schedule and add the replacement(s)
          scheduleByTuid[schedule.tuid] = scheduleByTuid[schedule.tuid]
            .filter(s => s !== scheduleJ)
            .concat(scheduleJ.applyOverlay(schedule, idGenerator));
        }
      }

      // add the schedule to the index, unless it's a cancellation
      if (schedule.stp !== STP.Cancellation) {
        (scheduleByTuid[schedule.tuid] = scheduleByTuid[schedule.tuid] || []).push(schedule);
      }
    }

    return this.flatten(scheduleByTuid);
  }

  /**
   * Flatten the index into a list of schedules
   */
  private static flatten(scheduleByTuid: ScheduleIndex): Schedule[] {
    const results: Schedule[] = [];

    for (const tuid in scheduleByTuid) {
      results.push(...scheduleByTuid[tuid]);
    }

    return results;
  }

  /**
   * Return a Iterator that generates incremental numbers starting at the given number
   */
  private static *getIdGenerator(startId: number): IterableIterator<number> {
    let id = startId + 1;

    while (true) {
      yield id++;
    }
  }
}

type ScheduleIndex = {
  [tuid: string]: Schedule[]
}
