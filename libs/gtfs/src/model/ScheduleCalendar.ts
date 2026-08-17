
import memoize from "memoized-class-decorator";
import {Calendar} from "../entity/Calendar";
import {CalendarDate} from "../entity/CalendarDate";
import {compare, dayOfWeek, maxDate, minDate, toYYYYMMDD} from "./PlainDate";

export class ScheduleCalendar {
  constructor(
    public readonly runsFrom: Temporal.PlainDate,
    public readonly runsTo: Temporal.PlainDate,
    public readonly days: Days,
    public readonly excludeDays: ExcludeDays = {}
  )  { }

  @memoize
  public get id() {
    return toYYYYMMDD(this.runsFrom) + toYYYYMMDD(this.runsTo) + this.binaryDays + Object.keys(this.excludeDays).join("");
  }

  @memoize
  public get binaryDays(): number {
    return parseInt(Object.values(this.days).join(""), 2);
  }

  /**
   * Returns true if the calendar does not run on any days e.g. when the whole day range has been excluded
   */
  public get isEmpty(): boolean {
    const start = this.runsFrom;
    const end = this.runsTo;

    for (let date = start; compare(date, end) <= 0; date = date.add({ days: 1 })) {
      if (this.days[dayOfWeek(date)] && !this.excludeDays[toYYYYMMDD(date)]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Count the number of days that the overlay shares with this schedule and return true if the max has been exceeded
   */
  public getOverlap(overlay: ScheduleCalendar): OverlapType {
    // if there are no overlapping days
    if ((this.binaryDays & overlay.binaryDays) === 0) {
      return OverlapType.None;
    }

    let first = this.sharedDays(overlay).next();
    return first.done ? OverlapType.None : OverlapType.Overlap;
  }

  /**
   * Add each date in the range as an exclude day
   */
  public addExcludeDays(overlay: ScheduleCalendar): ScheduleCalendar | null {
    const excludeDays = Object.assign({}, this.excludeDays); // clone

    for (const sharedDay of this.sharedDays(overlay)) {
      excludeDays[toYYYYMMDD(sharedDay)] = sharedDay;
    }

    const calendar = this.clone(this.runsFrom, this.runsTo, NO_DAYS, excludeDays);

    return calendar.isEmpty ? null : calendar;
  }

  /**
   * Returns the overlapping days between schedules, accounting for exclude days for each calendar
   */
  private* sharedDays(overlay: ScheduleCalendar) {
    const endDate = minDate(this.runsTo, overlay.runsTo);
    let date = maxDate(this.runsFrom, overlay.runsFrom);

    while (compare(date, endDate) <= 0) {
      const day = dayOfWeek(date);

      if (this.days[day] && overlay.days[day]
        && !this.excludeDays[toYYYYMMDD(date)] && !overlay.excludeDays[toYYYYMMDD(date)]) {
        yield date;
      }

      date = date.add({ days: 1 });
    }
  }

  /**
   * Remove the given days from the calendar
   */
  public clone(start: Temporal.PlainDate,
               end: Temporal.PlainDate,
               removeDays: Days = NO_DAYS,
               excludeDays: ExcludeDays = this.excludeDays): ScheduleCalendar {

    const days = this.removeDays(removeDays);
    let startDate = start;
    let endDate = end;

    const newExcludes = Object
      .values(excludeDays)
      .filter(d => compare(d, startDate) >= 0 && compare(d, endDate) <= 0)
      .reduce((days: ExcludeDays, day) => { days[toYYYYMMDD(day)] = day; return days; }, {});

    return new ScheduleCalendar(startDate, endDate, days, newExcludes);
  }

  private removeDays(days: Days): Days {
    return {
      0: this.days[0] && !days[0] ? 1 : 0,
      1: this.days[1] && !days[1] ? 1 : 0,
      2: this.days[2] && !days[2] ? 1 : 0,
      3: this.days[3] && !days[3] ? 1 : 0,
      4: this.days[4] && !days[4] ? 1 : 0,
      5: this.days[5] && !days[5] ? 1 : 0,
      6: this.days[6] && !days[6] ? 1 : 0
    };
  }

  /**
   * Convert to a GTFS Calendar object
   */
  public toCalendar(serviceId: number): Calendar {
    return {
      service_id: serviceId,
      monday: this.days[1],
      tuesday: this.days[2],
      wednesday: this.days[3],
      thursday: this.days[4],
      friday: this.days[5],
      saturday: this.days[6],
      sunday: this.days[0],
      start_date: toYYYYMMDD(this.runsFrom),
      end_date: toYYYYMMDD(this.runsTo),
    };
  }

  /**
   * Convert exclude days to GTFS Calendar Dates
   */
  public toCalendarDates(serviceId: number): CalendarDate[] {
    return Object.values(this.excludeDays).map(d => {
      return {
        service_id: serviceId,
        date: toYYYYMMDD(d),
        exception_type: 2
      };
    });
  }

  /**
   * Shift the calendar forward a day
   */
  @memoize
  public shiftForward(): ScheduleCalendar {
    const excludeDays: ExcludeDays = {};

    for (const day of Object.values(this.excludeDays)) {
      const shiftedDay = day.add({ days: 1 });

      excludeDays[toYYYYMMDD(shiftedDay)] = shiftedDay;
    }

    return new ScheduleCalendar(
      this.runsFrom.add({ days: 1 }),
      this.runsTo.add({ days: 1 }),
      {
        0: this.days[6],
        1: this.days[0],
        2: this.days[1],
        3: this.days[2],
        4: this.days[3],
        5: this.days[4],
        6: this.days[5],
      },
      excludeDays
    )
  }

  /**
   * Shift the calendar back a day
   */
  @memoize
  public shiftBackward(): ScheduleCalendar {
    const excludeDays: ExcludeDays = {};

    for (const day of Object.values(this.excludeDays)) {
      const shiftedDay = day.subtract({ days: 1 });

      excludeDays[toYYYYMMDD(shiftedDay)] = shiftedDay;
    }

    return new ScheduleCalendar(
      this.runsFrom.subtract({ days: 1 }),
      this.runsTo.subtract({ days: 1 }),
      {
        0: this.days[1],
        1: this.days[2],
        2: this.days[3],
        3: this.days[4],
        4: this.days[5],
        5: this.days[6],
        6: this.days[0],
      },
      excludeDays
    )
  }


}

export type ExcludeDays = {
  [date: string]: Temporal.PlainDate
}

export interface Days {
  0: 0 | 1;
  1: 0 | 1;
  2: 0 | 1;
  3: 0 | 1;
  4: 0 | 1;
  5: 0 | 1;
  6: 0 | 1;
}

export type BankHoliday = string;

export enum OverlapType {
  None = 0,
  Overlap = 1
}

export const NO_DAYS: Days = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
