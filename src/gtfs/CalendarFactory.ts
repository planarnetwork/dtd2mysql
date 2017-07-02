
import {Schedule} from "./native/Schedule";
import {ScheduleCalendar} from "./native/ScheduleCalendar";
import {Calendar} from "./file/Calendar";
import {CalendarDate} from "./file/CalendarDate";
import {Moment} from "moment";

export class CalendarFactory {

  constructor(
    private readonly bankHolidays: Moment[]
  ) {}

  /**
   * Load the schedules and create the calendar and calendar exceptions from the schedule records
   */
  public createCalendar(schedules: Schedule[]): [Calendar[], CalendarDate[], ServiceIdIndex] {
    const calendarsByScheduleId = this.getCalendarsBySchedule(schedules);
    const uniqueCalendars = this.getUniqueCalendars(calendarsByScheduleId);
    const serviceIdByScheduleId = this.getServiceIdBySchedule(calendarsByScheduleId, uniqueCalendars);
    const calendars: Calendar[] = [];
    const calendarDates: CalendarDate[] = [];

    for (const serviceId of Object.values(uniqueCalendars)) {
      for (const scheduleCalendar of calendarsByScheduleId[serviceId]) {
        scheduleCalendar.addBankHolidays(this.bankHolidays);

        calendars.push(scheduleCalendar.toCalendar(serviceId));
        calendarDates.push(...scheduleCalendar.toCalendarDates(serviceId));
      }
    }

    return [calendars, calendarDates, serviceIdByScheduleId];
  }

  /**
   * Index the calendars by schedule ID detecting overlapping TUIDs and dividing calendar entries
   */
  private getCalendarsBySchedule(schedules: Schedule[]): CalendarIndex {
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

  /**
   * Index all the schedules based on the unqiue key of all their calendars to get an index of unqiue calendars
   */
  private getUniqueCalendars(calendarsByScheduleId: CalendarIndex): ServiceIdIndex {
    const uniqueCalendars: ServiceIdIndex = {};

    for (const scheduleId in calendarsByScheduleId) {
      // the calendar ID must consist of all of the service's calendars in order to for it to share with another service
      const calendarId = calendarsByScheduleId[scheduleId].map(c => c.id).join("|");

      uniqueCalendars[calendarId] = scheduleId;
    }

    return uniqueCalendars;
  }

  /**
   * Iterate the schedules re-calculating their unique calendar ID to obtain a mapping of scheduleId to "serviceId"
   */
  private getServiceIdBySchedule(calendarsByScheduleId: CalendarIndex, uniqueCalendars: ServiceIdIndex): ServiceIdIndex {
    const serviceIdByScheduleId = {};

    for (const scheduleId in calendarsByScheduleId) {
      const calendarId = calendarsByScheduleId[scheduleId].map(c => c.id).join("|");

      serviceIdByScheduleId[scheduleId] = uniqueCalendars[calendarId];
    }

    return serviceIdByScheduleId;
  }
}


type CalendarIndex = {
  [id: string]: ScheduleCalendar[]
}

type ScheduleIndex = {
  [id: string]: Schedule[]
}

export type ServiceIdIndex = {
  [calendarId: string]: string
};