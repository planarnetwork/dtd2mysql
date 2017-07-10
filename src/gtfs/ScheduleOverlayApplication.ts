//
// import {Schedule} from "./native/Schedule";
// import {Association} from "./native/Association";
// import {OverlayRecord, STP} from "./native/OverlayRecord";
//
// export class ScheduleOverlayApplication {
//
//   /**
//    * Index the schedules by TUID, detect overlays and create new schedules as necessary.
//    */
//   public static processOverlays(schedules: OverlayRecord[]): OverlayIndex {
//     const schedulesByTuid: OverlayIndex = {};
//     const idGenerator = this.getIdGenerator(schedules[schedules.length -1].id + 1);
//
//     for (const schedule of schedules) {
//       // for all cancellation or overlays (perms don't overlap)
//       if (schedule.stp !== STP.Permanent) {
//         // get any schedules that share the same TUID
//         for (const scheduleJ of schedulesByTuid[schedule.tuid] || []) {
//           // remove the underlying schedule and add the replacement(s)
//           schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid]
//             .filter(s => s !== scheduleJ)
//             .concat(scheduleJ.applyOverlay(schedule, idGenerator));
//         }
//       }
//
//       // add the schedule to the index, unless it's a cancellation
//       if (schedule.stp !== STP.Cancellation) {
//         (schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid] || []).push(schedule);
//       }
//     }
//
//     return schedulesByTuid;
//   }
//
//   public static applyAssociations(schedulesByTuid: OverlayIndex, associations: Association[]): OverlayIndex {
//     for (const association of associations) {
//       const baseSchedule = association.getBaseSchedule(schedulesByTuid[association.baseTUID]);
//       const assocSchedule = association.getAssocSchedule(schedulesByTuid[association.assocTUID]);
//
//       // replace the assoc schedule with the new version
//       schedulesByTuid[association.assocTUID] = schedulesByTuid[association.assocTUID]
//         .filter(s => s != assocSchedule)
//         .concat(association.apply(baseSchedule, assocSchedule));
//     }
//
//     return schedulesByTuid;
//   }
//
//   /**
//    * Flatten the index into a list of schedules, detecting any schedules that can be merged in the process.
//    */
//   public static reduce(schedulesByTuid: OverlayIndex): OverlayRecord[] {
//     const results: OverlayRecord[] = [];
//
//     for (const tuid in schedulesByTuid) {
//       // group schedules that run on the same days with the exact same stopping pattern
//       const schedulesByHash: OverlayIndex = schedulesByTuid[tuid].reduce((prev, cur) => {
//         (prev[cur.hash] = prev[cur.hash] || []).push(cur);
//
//         return prev;
//       }, {});
//
//       // for each group of schedules that might be merged
//       for (const groupedSchedules of Object.values(schedulesByHash)) {
//         // sortSchedules by start date
//         groupedSchedules.sort(this.sortOverlays);
//
//         // iterate through each schedule
//         for (let i = 0; i < groupedSchedules.length; i++) {
//           let scheduleI = groupedSchedules[i];
//
//           // merge as many schedules in as possible
//           while (groupedSchedules[i + 1] && scheduleI.calendar.canMerge(groupedSchedules[i + 1].calendar)) {
//             scheduleI = scheduleI.clone(scheduleI.calendar.merge(groupedSchedules[++i].calendar), scheduleI.id);
//           }
//
//           results.push(scheduleI);
//         }
//       }
//     }
//
//     return results;
//   }
//
//   /**
//    * Return a Iterator that generates incremental numbers starting at the given number
//    */
//   private static *getIdGenerator(startId: number): IterableIterator<number> {
//     let id = startId + 1;
//
//     while (true) {
//       yield id++;
//     }
//   }
//
//   /**
//    * Sort the given schedules by date
//    */
//   private static sortOverlays(a: Schedule, b: Schedule): number {
//     return a.calendar.runsFrom.isSameOrBefore(b.calendar.runsFrom) ? -1 : 1;
//   }
// }
//
// export type OverlayIndex = {
//   [tuid: string]: OverlayRecord[]
// }
