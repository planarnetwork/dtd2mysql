import {CalendarDateRow, CalendarRow, RowWriter} from "@gb-transit/gtfs-schema";
import {addDays, getDayOfWeek} from "@gb-transit/gtfs-loader";
import {CalendarFactory} from "../calendar/CalendarFactory";
import {MemoizedSequence} from "../../sequence/MemoizedSequence";
import {close, push} from "./Push";

/** Sunday first, as getDayOfWeek numbers the days. */
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export class CalendarMerger {

  constructor(
    private readonly calendar: RowWriter<CalendarRow>,
    private readonly calendarDates: RowWriter<CalendarDateRow>,
    private readonly calendarFactory: CalendarFactory,
    private readonly serviceIdSequence: MemoizedSequence
  ) {}

  /**
   * Write the calendars, collapsing any that say the same thing onto one service
   * id, and return a map of old service id to new.
   */
  public async write(
    calendars: CalendarRow[],
    dateIndex: Record<string, CalendarDateRow[]>
  ): Promise<ServiceIDMap> {
    const serviceIdMap: ServiceIDMap = {};

    for (const calendar of calendars) {
      const calendarDates = dateIndex[String(calendar.service_id)] || [];

      await this.writeCalendar(calendar, calendarDates, serviceIdMap);
    }

    // A service described only by its exception dates has no calendar row to
    // collapse, so one is synthesised to cover them.
    for (const serviceId of Object.keys(dateIndex)) {
      if (serviceIdMap[serviceId] === undefined) {
        const [calendar, calendarDates] = this.calendarFactory.create(serviceId, dateIndex[serviceId]);

        await this.writeCalendar(calendar, calendarDates, serviceIdMap);
      }
    }

    return serviceIdMap;
  }

  private async writeCalendar(
    calendar: CalendarRow,
    calendarDates: CalendarDateRow[],
    serviceIdMap: ServiceIDMap
  ): Promise<void> {
    // A service with no day left is not written and not mapped, so the trips
    // indexed against it are dropped and their calls with them. A feed can say
    // this in more than one way - a calendar of no days, a range that excludes
    // every day it runs, or nothing but removals - and none of them are a
    // service anything can be planned onto.
    if (!this.runsAtAll(calendar, calendarDates)) {
      return;
    }

    const hash = this.getCalendarHash(calendar, calendarDates);
    const alreadySeenCalendar = this.serviceIdSequence.haveSeen(hash);
    const newServiceId = this.serviceIdSequence.get(hash);

    serviceIdMap[String(calendar.service_id)] = newServiceId;

    if (!alreadySeenCalendar) {
      calendar.service_id = newServiceId;
      await push(this.calendar, calendar);

      for (const calendarDay of calendarDates) {
        calendarDay.service_id = newServiceId;
        await push(this.calendarDates, calendarDay);
      }
    }
  }

  /**
   * Does this service ever operate?
   *
   * Answered against the days rather than by counting rows, because a calendar
   * that runs every Monday for a year and excludes all fifty two of them runs as
   * often as one that names no day at all.
   */
  private runsAtAll(calendar: CalendarRow, calendarDates: CalendarDateRow[]): boolean {
    const removed = new Set<string>();

    for (const date of calendarDates) {
      if (Number(date.exception_type) === 1) {
        return true;
      }

      removed.add(String(date.date));
    }

    const start = Number(calendar.start_date);
    const end = Number(calendar.end_date);

    // A calendar without a range to walk is kept rather than dropped: this is
    // here to remove services that say they never run, not to judge rows it
    // cannot read.
    if (!start || !end) {
      return true;
    }

    for (let date = start; date <= end; date = addDays(date, 1)) {
      if (calendar[DAYS[getDayOfWeek(date)]] && !removed.has(String(date))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Two services that run on the same days between the same dates, with the same
   * exceptions, are the same service however the feeds numbered them.
   *
   * The exceptions are sorted first: they are the same set of exceptions whatever
   * order the feed happened to list them in, and comparing them as listed left
   * two identical services in the merged feed as two.
   */
  private getCalendarHash(calendar: CalendarRow, calendarDates: CalendarDateRow[]): string {
    const {service_id, ...rest} = calendar;
    const days = calendarDates
      .map(d => d.date + "_" + d.exception_type)
      .sort()
      .join(":");
    const fields = Object.values({days, ...rest});

    return fields.join();
  }

  public async end(): Promise<void> {
    await Promise.all([close(this.calendar), close(this.calendarDates)]);
  }

}

export type ServiceIDMap = Record<string, number>;
