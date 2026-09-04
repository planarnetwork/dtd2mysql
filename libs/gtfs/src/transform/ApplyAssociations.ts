
import {Association, AssociationLink} from "../model/Association";
import {Schedule} from "../model/Schedule";
import {OverlapType, ScheduleCalendar} from "../model/ScheduleCalendar";
import {IdGenerator} from "../model/OverlayRecord";

/**
 * Iterate through the associations matching association schedules records with base schedules and
 * coupling them as a join or split.
 *
 * The base is left as it is. The associated schedule is cut into the days it is coupled, which is
 * the trip the link names, and the days it runs by itself.
 */
export function applyAssociations(schedulesByTuid: ScheduleIndex,
                                  associationsIndex: AssociationIndex,
                                  idGenerator: IdGenerator): AssociatedSchedules {

  const links: AssociationLink[] = [];
  const associated: Schedule[] = [];

  for (const associations of Object.values(associationsIndex)) {
    // for each association
    for (const association of associations) {
      // get the date range for the associated schedules
      const assocCalendar = association.inAssocDays(association.calendar);

      // get the associated schedules inside the date range of the association
      for (const assocSchedule of findSchedules(schedulesByTuid[association.assocTUID] || [], assocCalendar)) {
        // get the date range for the target base schedule (same or previous day of associated schedule NOT the association)
        const baseCalendar = association.inBaseDays(assocSchedule.calendar);

        // find the matching base record
        const baseSchedules = findSchedules(schedulesByTuid[association.baseTUID] || [], baseCalendar);

        if (baseSchedules.length === 0) {
          continue;
        }

        const applied = association.apply(baseSchedules[0], assocSchedule, idGenerator);

        if (applied === null) {
          continue;
        }

        links.push(applied.link);
        associated.push(applied.associated);

        // remove the original associated schedule and replace with any substitute schedules created
        const schedules = schedulesByTuid[assocSchedule.tuid];

        schedules.splice(schedules.indexOf(assocSchedule), 1, ...(applied.asDated === null ? [] : [applied.asDated]));
      }
    }
  }

  // Only once every association has been applied. An associated schedule's calendar is told in the
  // base's service days, so leaving it where the next association looks would match it against a
  // calendar counted the other way and couple it a second time. What is left behind is the days it
  // runs uncoupled, which is what a second association should be drawing from.
  for (const schedule of associated) {
    (schedulesByTuid[schedule.tuid] = schedulesByTuid[schedule.tuid] || []).push(schedule);
  }

  return {schedules: schedulesByTuid, links};
}

/**
 * Return schedules that overlap with the given calendar
 */
function findSchedules(schedules: Schedule[], calendar: ScheduleCalendar): Schedule[] {
  return schedules.filter(schedule => calendar.getOverlap(schedule.calendar) !== OverlapType.None);
}

export type ScheduleIndex = {
  [tuid: string]: Schedule[];
}

export type AssociationIndex = {
  [tuid: string]: Association[];
}

export type AssociatedSchedules = {
  schedules: ScheduleIndex,
  links: AssociationLink[]
}
