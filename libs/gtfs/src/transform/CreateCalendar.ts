import {Calendar} from "../entity/Calendar";
import {CalendarDate} from "../entity/CalendarDate";
import {ScheduleCalendar} from "../model/ScheduleCalendar";

/**
 * Return the unique GTFS calendars and an index mapping calendar ID to service ID.
 *
 * The service IDs come from a sort of the calendar's own identity - its date
 * range, its day mask and its exclusions - rather than from the order the
 * schedules happened to arrive in. The same timetable therefore numbers its
 * services the same way whichever source produced it and whichever order it
 * came out in.
 */
export function createCalendar(schedules: HasCalendar[]): [Calendar[], CalendarDate[], ServiceIdIndex] {
  const unique = new Map<string, ScheduleCalendar>();

  for (const schedule of schedules) {
    if (!unique.has(schedule.calendar.id)) {
      unique.set(schedule.calendar.id, schedule.calendar);
    }
  }

  const serviceIdIndex: ServiceIdIndex = {};
  const calendars: Calendar[] = [];
  const calendarDates: CalendarDate[] = [];
  let serviceId = 0;

  for (const id of [...unique.keys()].sort()) {
    const calendar = unique.get(id)!;

    serviceIdIndex[id] = ++serviceId;
    calendars.push(calendar.toCalendar(serviceId));
    calendarDates.push(...calendar.toCalendarDates(serviceId));
  }

  return [calendars, calendarDates, serviceIdIndex];
}

export type ServiceIdIndex = {
  [calendarId: string]: number;
}

export interface HasCalendar {
  calendar: ScheduleCalendar;
}
