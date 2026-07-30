
import memoize from "memoized-class-decorator";
import {Calendar} from "../file/Calendar";
import {CalendarDate} from "../file/CalendarDate";
import {compare, dayOfWeek, maxDate, minDate, toYYYYMMDD} from "./PlainDate";

export class ScheduleCalendar {
  public static readonly SHORT_OVERLAY_LENGTH = 7;

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
   * Count the number of days that the overlay shares with this schedule and return true if the max has been exceeded
   */
  public getOverlap(overlay: ScheduleCalendar): OverlapType {
    // if there are no overlapping days
    if ((this.binaryDays & overlay.binaryDays) === 0) {
      return OverlapType.None;
    }

    let numDays = 0;

    for (const sharedDay of this.sharedDays(overlay)) {
      const key = toYYYYMMDD(sharedDay);
      const isShared = !this.excludeDays[key] && !overlay.excludeDays[key];

      if (isShared && ++numDays > ScheduleCalendar.SHORT_OVERLAY_LENGTH) {
        return OverlapType.Long;
      }
    }

    return (numDays > 0) ? OverlapType.Short : OverlapType.None;
  }

  /**
   * Add each date in the range as an exclude day
   */
  public addExcludeDays(overlay: ScheduleCalendar): ScheduleCalendar[] {
    const excludeDays = Object.assign({}, this.excludeDays); // clone

    for (const sharedDay of this.sharedDays(overlay)) {
      excludeDays[toYYYYMMDD(sharedDay)] = sharedDay;
    }

    const calendar = this.clone(this.runsFrom, this.runsTo, NO_DAYS, excludeDays);

    return compare(calendar.runsFrom, calendar.runsTo) <= 0 ? [calendar] : [];
  }

  /**
   * Returns the overlapping days between schedules (does not account for exclude days)
   */
  private* sharedDays(overlay: ScheduleCalendar) {
    const endDate = minDate(this.runsTo, overlay.runsTo);
    let date = maxDate(this.runsFrom, overlay.runsFrom);

    while (compare(date, endDate) <= 0) {
      const day = dayOfWeek(date);

      if (this.days[day] && overlay.days[day]) {
        yield date;
      }

      date = date.add({ days: 1 });
    }
  }

  /**
   * Remove the given date range from this schedule and return one or two calendars
   */
  public divideAround(calendar: ScheduleCalendar): ScheduleCalendar[] {
    const calendars: ScheduleCalendar[] = [
      this.clone(this.runsFrom, calendar.runsFrom.subtract({ days: 1 })),
      this.clone(calendar.runsTo.add({ days: 1 }), this.runsTo)
    ];

    // if there are any days left after applying the overlay
    if (this.binaryDays - (this.binaryDays & calendar.binaryDays) > 0) {
      calendars.push(this.clone(
        calendar.runsFrom,
        calendar.runsTo,
        calendar.days,
        this.excludeDays
      ));
    }

    return calendars.filter(c => compare(c.runsFrom, c.runsTo) <= 0);
  }

  /**
   * Remove the given days from the calendar then tighten the dates
   */
  public clone(start: Temporal.PlainDate,
               end: Temporal.PlainDate,
               removeDays: Days = NO_DAYS,
               excludeDays: ExcludeDays = this.excludeDays): ScheduleCalendar {

    const days = this.removeDays(removeDays);
    let startDate = start;
    let endDate = end;

    // skip forward to the first day the schedule is operating
    while (days[dayOfWeek(startDate)] === 0 || excludeDays[toYYYYMMDD(startDate)] && compare(startDate, endDate) <= 0) {
      startDate = startDate.add({ days: 1 });
    }

    // skip backward to the first day the schedule is operating
    while (days[dayOfWeek(endDate)] === 0 || excludeDays[toYYYYMMDD(endDate)] && compare(endDate, startDate) >= 0) {
      endDate = endDate.subtract({ days: 1 });
    }

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
   * Returns true if this calendar would not be valid on any days before the given calendar starts
   */
  public canMerge(calendar: ScheduleCalendar): boolean {
    let date = this.runsTo.add({ days: 1 });
    let numAdditionalExcludeDays = 0;

    while (compare(date, calendar.runsFrom) < 0) {
      if (this.days[dayOfWeek(date)] && ++numAdditionalExcludeDays > ScheduleCalendar.SHORT_OVERLAY_LENGTH) {
        return false;
      }

      date = date.add({ days: 1 });
    }

    return true;
  }

  /**
   * Return a new calendar starting from the runsFrom of this calendar and running to the runsTo of the given calendar.
   *
   * Exclude days are merged together.
   */
  public merge(calendar: ScheduleCalendar): ScheduleCalendar {
    const excludeDays = Object.assign({}, calendar.excludeDays, this.excludeDays);
    let date = this.runsTo.add({ days: 1 });

    while (compare(date, calendar.runsFrom) < 0) {
      if (this.days[dayOfWeek(date)]) {
        excludeDays[toYYYYMMDD(date)] = date;
      }

      date = date.add({ days: 1 });
    }

    // for any shared
    for (const sharedDay of this.sharedDays(calendar)) {
      const key = toYYYYMMDD(sharedDay);

      // if the shared day is only excluded in one overlay, remove it
      if (!(this.excludeDays[key] && calendar.excludeDays[key])) {
        delete excludeDays[key];
      }
    }

    return new ScheduleCalendar(
      this.runsFrom,
      maxDate(this.runsTo, calendar.runsTo),
      this.days,
      excludeDays
    );
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
  Short = 1,
  Long = 2
}

export const NO_DAYS: Days = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
