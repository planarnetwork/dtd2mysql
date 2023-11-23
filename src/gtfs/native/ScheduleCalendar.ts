
import {Moment} from "moment";
import * as memoize from "memoized-class-decorator";
import moment = require("moment");
import {Calendar} from "../file/Calendar";
import {CalendarDate} from "../file/CalendarDate";

export class ScheduleCalendar {
  public static readonly SHORT_OVERLAY_LENGTH = 7;

  constructor(
    public readonly runsFrom: Moment,
    public readonly runsTo: Moment,
    public readonly days: Days,
    public readonly excludeDays: ExcludeDays = {}
  )  { }

  @memoize
  public get id() {
    return this.runsFrom.format("YYYYMMDD") + this.runsTo.format("YYYYMMDD") + this.binaryDays + Object.keys(this.excludeDays).join("");
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
      const key = sharedDay.format("YYYYMMDD");
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
      excludeDays[sharedDay.format("YYYYMMDD")] = sharedDay;
    }

    const calendar = this.clone(this.runsFrom, this.runsTo, NO_DAYS, excludeDays);

    return calendar !== null ? [calendar] : [];
  }

  /**
   * Returns the overlapping days between schedules (does not account for exclude days)
   */
  private* sharedDays(overlay: ScheduleCalendar) {
    const startDate = moment.max(this.runsFrom, overlay.runsFrom).clone();
    const endDate = moment.min(this.runsTo, overlay.runsTo);

    while (startDate.isSameOrBefore(endDate)) {
      if (this.days[startDate.day()] && overlay.days[startDate.day()]) {
        yield startDate.clone();
      }

      startDate.add(1, "days");
    }
  }

  /**
   * Remove the given date range from this schedule and return one or two calendars
   */
  public divideAround(calendar: ScheduleCalendar): ScheduleCalendar[] {
    const calendars: (ScheduleCalendar|null)[] = [
      this.clone(this.runsFrom.clone(), calendar.runsFrom.clone().subtract(1, "days")),
      this.clone(calendar.runsTo.clone().add(1, "days"), this.runsTo.clone())
    ];

    // if there are any days left after applying the overlay
    if (this.binaryDays - (this.binaryDays & calendar.binaryDays) > 0) {
      calendars.push(this.clone(
        calendar.runsFrom.clone(),
        calendar.runsTo.clone(),
        calendar.days,
        this.excludeDays
      ));
    }

    return calendars.filter((c) : c is ScheduleCalendar => c !== null);
  }

  /**
   * Remove the given days from the calendar then tighten the dates
   */
  public clone(start: Moment,
               end: Moment,
               removeDays: Days = NO_DAYS,
               excludeDays: ExcludeDays = this.excludeDays): ScheduleCalendar | null {

    const days = this.removeDays(removeDays);
    start = start.clone();
    end = end.clone();

    // skip forward to the first day the schedule is operating
    while (days[start.day()] === 0 || excludeDays[start.format("YYYYMMDD")] && start.isSameOrBefore(end)) {
      start.add(1, "days");
    }

    // skip backward to the first day the schedule is operating
    while (days[end.day()] === 0  || excludeDays[end.format("YYYYMMDD")] && end.isSameOrAfter(start)) {
      end.subtract(1, "days");
    }

    const newExcludes = Object
      .values(excludeDays)
      .filter(d => d.isBetween(start, end, "days", "[]"))
      .reduce((days: ExcludeDays, day: Moment) => { days[day.format("YYYYMMDD")] = day; return days; }, {});

    return start.isSameOrBefore(end) ? new ScheduleCalendar(start, end, days, newExcludes) : null;
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
      start_date: this.runsFrom.format("YYYYMMDD"),
      end_date: this.runsTo.format("YYYYMMDD"),
    };
  }

  /**
   * Convert exclude days to GTFS Calendar Dates
   */
  public toCalendarDates(serviceId: number): CalendarDate[] {
    return Object.values(this.excludeDays).map(d => {
      return {
        service_id: serviceId,
        date: d.format("YYYYMMDD"),
        exception_type: 2
      };
    });
  }

  /**
   * Returns true if this calendar would not be valid on any days before the given calendar starts
   */
  public canMerge(calendar: ScheduleCalendar): boolean {
    const startDate = this.runsTo.clone();
    let  numAdditionalExcludeDays = 0;

    while (startDate.add(1, "days").isBefore(calendar.runsFrom)) {
      if (this.days[startDate.day()] && ++numAdditionalExcludeDays > ScheduleCalendar.SHORT_OVERLAY_LENGTH) {
        return false;
      }
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
    const startDate = this.runsTo.clone();

    while (startDate.add(1, "days").isBefore(calendar.runsFrom)) {
      if (this.days[startDate.day()]) {
        excludeDays[startDate.format("YYYYMMDD")] = startDate.clone();
      }
    }

    // for any shared
    for (const sharedDay of this.sharedDays(calendar)) {
      const key = sharedDay.format("YYYYMMDD");

      // if the shared day is only excluded in one overlay, remove it
      if (!(this.excludeDays[key] && calendar.excludeDays[key])) {
        delete excludeDays[key];
      }
    }

    return new ScheduleCalendar(
      this.runsFrom,
      moment.max(this.runsTo, calendar.runsTo),
      this.days,
      excludeDays
    );
  }

  /**
   * Shift the calendar forward a day
   */
  @memoize
  public shiftForward(): ScheduleCalendar {
    const excludeDays = {};

    for (const day of Object.values(this.excludeDays)) {
      const shiftedDay = day.clone().add(1, "days");

      excludeDays[shiftedDay.format("YYYYMMDD")] = shiftedDay;
    }

    return new ScheduleCalendar(
      this.runsFrom.clone().add(1, "days"),
      this.runsTo.clone().add(1, "days"),
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
    const excludeDays = {};

    for (const day of Object.values(this.excludeDays)) {
      const shiftedDay = day.clone().subtract(1, "days");

      excludeDays[shiftedDay.format("YYYYMMDD")] = shiftedDay;
    }

    return new ScheduleCalendar(
      this.runsFrom.clone().subtract(1, "days"),
      this.runsTo.clone().subtract(1, "days"),
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
  [date: string]: Moment
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