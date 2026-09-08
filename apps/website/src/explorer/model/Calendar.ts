import {Service, addDays, getDayOfWeek} from "@gb-transit/gtfs-loader";
import type {DateNumber, DayOfWeek} from "@gb-transit/gtfs-loader";
import type {ColumnStore} from "./ColumnStore.js";
import type {FeedIndex} from "./FeedIndex.js";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** An exception_type, as GTFS numbers them. */
export const ADDED = 1;
export const REMOVED = 2;

export interface ServiceDate {
  readonly date: DateNumber;
  readonly runs: boolean;
  /** Set where calendar_dates.txt named this date, which is why it does or does not run. */
  readonly exception?: typeof ADDED | typeof REMOVED;
}

/**
 * The days a service runs, and why.
 *
 * "Why does this train not run on Tuesday" is the question this exists to answer, and the answer is
 * almost always a calendar_dates.txt row: an STP schedule replacing part of a permanent one becomes
 * exclusions on the permanent trip and a separate trip nobody linked to it. So a date is not just
 * in or out, it carries whether an exception put it that way.
 */
export class Calendars {

  private readonly services = new Map<string, Service>();
  private readonly exceptions = new Map<string, Map<DateNumber, number>>();

  constructor(calendar: ColumnStore | undefined, calendarDates: ColumnStore | undefined) {
    for (let row = 0; calendarDates !== undefined && row < calendarDates.rows; row++) {
      const serviceId = calendarDates.value("service_id", row);
      const date = Number(calendarDates.value("date", row));
      const type = Number(calendarDates.value("exception_type", row));

      if (serviceId === undefined || !Number.isFinite(date)) {
        continue;
      }

      const dates = this.exceptions.get(serviceId) ?? new Map<DateNumber, number>();

      dates.set(date, type);
      this.exceptions.set(serviceId, dates);
    }

    for (let row = 0; calendar !== undefined && row < calendar.rows; row++) {
      const serviceId = calendar.value("service_id", row);

      if (serviceId === undefined) {
        continue;
      }

      const days = {} as Record<DayOfWeek, boolean>;

      for (let day = 0; day < 7; day++) {
        days[day as DayOfWeek] = calendar.value(DAYS[day], row) === "1";
      }

      // Service takes the exceptions as a truth table rather than as rows, which is also what makes
      // a date it names win over the weekday pattern.
      const dates: Record<number, boolean> = {};

      for (const [date, type] of this.exceptions.get(serviceId) ?? []) {
        dates[date] = type === ADDED;
      }

      this.services.set(serviceId, new Service(
        Number(calendar.value("start_date", row)),
        Number(calendar.value("end_date", row)),
        days,
        dates
      ));
    }

    // A service named only by calendar_dates.txt is legal GTFS: it runs on the dates added and on no
    // others. Without this it would look like a trip with no calendar at all.
    for (const [serviceId, dates] of this.exceptions) {
      if (this.services.has(serviceId)) {
        continue;
      }

      const added: Record<number, boolean> = {};

      for (const [date, type] of dates) {
        added[date] = type === ADDED;
      }

      this.services.set(serviceId, new Service(
        99999999, 0, {0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false}, added
      ));
    }
  }

  public has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  public get ids(): readonly string[] {
    return [...this.services.keys()];
  }

  public runsOn(serviceId: string, date: DateNumber): boolean {
    return this.services.get(serviceId)?.runsOn(date, getDayOfWeek(date)) ?? false;
  }

  public exceptionOn(serviceId: string, date: DateNumber): number | undefined {
    return this.exceptions.get(serviceId)?.get(date);
  }

  /**
   * Every date in a window, said whether the service runs and why.
   *
   * The window is the caller's rather than the feed's, so a service running to 2099 - and 23 of them
   * do - is answered without expanding twenty seven thousand days to find out.
   */
  public dates(serviceId: string, from: DateNumber, to: DateNumber): ServiceDate[] {
    const dates: ServiceDate[] = [];

    for (let date = from; date <= to; date = addDays(date, 1)) {
      dates.push({
        date,
        runs: this.runsOn(serviceId, date),
        exception: this.exceptionOn(serviceId, date) as ServiceDate["exception"]
      });
    }

    return dates;
  }

}

/**
 * The window feed_info.txt says the feed covers, widened by a day at each end.
 *
 * A day either side because a service day is not a calendar day: a train departing at 24:35 belongs
 * to the previous day's service, and a board for the first day of the feed has to be able to ask
 * about the day before it.
 */
export function feedWindow(feed: FeedIndex): {from: DateNumber, to: DateNumber} | undefined {
  const info = feed.files.get("feed_info.txt");

  if (info === undefined || info.rows === 0) {
    return undefined;
  }

  const from = Number(info.value("feed_start_date", 0));
  const to = Number(info.value("feed_end_date", 0));

  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0 || to === 0) {
    return undefined;
  }

  return {from: addDays(from, -1), to: addDays(to, 1)};
}
