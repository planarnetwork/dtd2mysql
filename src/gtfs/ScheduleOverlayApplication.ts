
import {Schedule, STP} from "./native/Schedule";

export class ScheduleOverlayApplication {

  /**
   * Index the schedules by TUID, detect overlays and create new schedules as necessary.
   */
  public static processSchedules(schedules: Schedule[]): Schedule[] {
    const schedulesByTuid: ScheduleIndex = {};
    const idGenerator = this.getIdGenerator(schedules[schedules.length -1].id + 1);

    for (const schedule of schedules) {
      // for all cancellation or overlays (perms don't overlap)
      if (schedule.stp !== STP.Permanent) {
        // get any schedules that share the same TUID
        for (const scheduleJ of schedulesByTuid[schedule.tuid] || []) {
          // remove the underlying schedule and add the replacement(s)
          schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid]
            .filter(s => s !== scheduleJ)
            .concat(scheduleJ.applyOverlay(schedule, idGenerator));
        }
      }

      // add the schedule to the index, unless it's a cancellation
      if (schedule.stp !== STP.Cancellation) {
        (schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid] || []).push(schedule);
      }
    }

    return this.flatten(schedulesByTuid);
  }

  /**
   * Flatten the index into a list of schedules, detecting any schedules that can be merged in the process.
   */
  private static flatten(schedulesByTuid: ScheduleIndex): Schedule[] {
    const results: Schedule[] = [];

    for (const tuid in schedulesByTuid) {
      // group schedules that run on the same days with the exact same stopping pattern
      const schedulesByHash: ScheduleIndex = schedulesByTuid[tuid].reduce((prev, cur) => {
        (prev[cur.hash] = prev[cur.hash] || []).push(cur);

        return prev;
      }, {});

      // for each group of schedules that might be merged
      for (const groupedSchedules of Object.values(schedulesByHash)) {
        // sort by start date
        groupedSchedules.sort(Schedule.sort);

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
