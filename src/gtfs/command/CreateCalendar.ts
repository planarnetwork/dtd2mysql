import {Calendar} from "../file/Calendar";
import {CalendarDate} from "../file/CalendarDate";
import {ScheduleCalendar} from "../native/ScheduleCalendar";

/**
 * Return the unique GTFS calendars and an index mapping calendar ID to service ID
 */
export function createCalendar(schedules: HasCalendar[]): [Calendar[], CalendarDate[], ServiceIdIndex] {
  const serviceIdIndex: ServiceIdIndex = {};
  const calendars: Calendar[] = [];
  const calendarDates: CalendarDate[] = [];
  let serviceId = 0;

  for (const schedule of schedules) {
    if (!serviceIdIndex[schedule.calendar.id]) {
      serviceIdIndex[schedule.calendar.id] = ++serviceId;

      calendars.push(schedule.calendar.toCalendar(serviceId));
      calendarDates.push(...schedule.calendar.toCalendarDates(serviceId));
    }
  }

  return [calendars, calendarDates, serviceIdIndex];
}

export type ServiceIdIndex = {
  [calendarId: number]: number;
}

export interface HasCalendar {
  calendar: ScheduleCalendar;
}