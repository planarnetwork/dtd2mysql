
import {Schedule} from "./native/Schedule";
import {ScheduleCalendar} from "./native/ScheduleCalendar";

export class CalendarFactory {

  /**
   * Load the schedules and create the calendar and calendar exceptions from the schedule records
   */
  public static createCalendar(schedules: Schedule[]): ScheduleCalendar[] {
    const calendarsByScheduleId = this.getCalendarsBySchedule(schedules);
    const scheduleIdByCalendarId = {};

    for (const scheduleId in calendarsByScheduleId) {
      // the calendar ID must consist of all of the service's calendars in order to for it to share with another service
      const calendarId = calendarsByScheduleId[scheduleId].map(c => c.id).join("|");

      scheduleIdByCalendarId[calendarId] = scheduleId;
    }

    // take the calendar of each schedule that resulted in a unique calendar
    return Object
      .values(scheduleIdByCalendarId)
      .map((scheduleId: number) => calendarsByScheduleId[scheduleId])
      .reduce((allCalendars, scheduleCalendars) => allCalendars.concat(scheduleCalendars), []);

    // for (const schedule of schedules) {
    //   const calendarId = calendarsByScheduleId[schedule.id].map(c => c.id).join("|");
    //   const serviceId = scheduleIdByCalendarId[calendarId];
    //
    //   //output trip
    // }

  }

  private static getCalendarsBySchedule(schedules: Schedule[]) {
    const scheduleByTuid: ScheduleIndex = {};
    const calendarBySchedule: CalendarIndex = {};

    for (const schedule of schedules) {
      // for any schedules that share the same TUID
      for (const scheduleJ of scheduleByTuid[schedule.tuid] || []) {
        // check each of the schedules calendars
        for (const calendarJ of calendarBySchedule[scheduleJ.id]) {
          // to see if this schedules calendar overlaps it at any point
          if (schedule.calendar.overlaps(calendarJ)) {
            const replacementCalendars = schedule.calendar.isShort
              ? calendarJ.addExcludeDays(schedule.calendar)
              : calendarJ.divideAround(schedule.calendar);

            // remove the current calendar and add the replacements
            calendarBySchedule[scheduleJ.id] = calendarBySchedule[scheduleJ.id]
              .filter(c => c !== calendarJ)
              .concat(replacementCalendars);
          }
        }
      }

      if (!schedule.isCancellation) {
        (scheduleByTuid[schedule.tuid] = scheduleByTuid[schedule.tuid] || []).push(schedule);
        (calendarBySchedule[schedule.id] = calendarBySchedule[schedule.id] || []).push(schedule.calendar);
      }
    }

    return calendarBySchedule;
  }

}


type CalendarIndex = {
  [id: string]: ScheduleCalendar[]
}

type ScheduleIndex = {
  [id: string]: Schedule[]
}
