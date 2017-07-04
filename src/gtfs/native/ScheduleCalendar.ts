
import {Moment} from "moment";
import memoize = require("memoized-class-decorator");
import moment = require("moment");
import {Calendar} from "../file/Calendar";
import {CalendarDate} from "../file/CalendarDate";

export class ScheduleCalendar {
  public static readonly SHORT_OVERLAY_LENGTH = 4;

  constructor(
    public readonly runsFrom: Moment,
    public readonly runsTo: Moment,
    public readonly days: Days,
    public readonly bankHoliday: 0 | 1,
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
   * Count the number of days that the overlay shares with this calendar and return true if the max has been exceeded
   */
  public getOverlap(overlay: ScheduleCalendar): OverlapType {
    // if there are no overlapping days
    if ((this.binaryDays & overlay.binaryDays) === 0) {
      return OverlapType.None;
    }

    let numDays = 0;

    for (const _ of this.sharedDays(overlay)) {
      if (++numDays > ScheduleCalendar.SHORT_OVERLAY_LENGTH) {
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

    return [
      new ScheduleCalendar(this.runsFrom, this.runsTo, this.days, this.bankHoliday, excludeDays)
    ];
  }

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
   * Remove the given date range from this calendar and return one or two calendars
   */
  public divideAround(calendar: ScheduleCalendar): ScheduleCalendar[] {
    const calendars: ScheduleCalendar[] = [
      this.cloneCalendar(this.runsFrom.clone(), calendar.runsFrom.clone().subtract(1, "days")),
      this.cloneCalendar(calendar.runsTo.clone().add(1, "days"), this.runsTo.clone())
    ];

    // if there are any days left after applying the overlay
    if (this.binaryDays - (this.binaryDays & calendar.binaryDays) > 0) {
      calendars.push(this.cloneCalendar(
        calendar.runsFrom.clone(),
        calendar.runsTo.clone(),
        calendar.days
      ));
    }

    return calendars.filter(c => c.runsFrom.isSameOrBefore(c.runsTo));
  }

  private cloneCalendar(start: Moment, end: Moment, removeDays: Days = { 0: 0, 1: 0, 2: 0, 3:0, 4: 0, 5: 0, 6: 0 }): ScheduleCalendar {
    const days = this.removeDays(removeDays);

    // skip forward to the first day the schedule is operating
    while (days[start.day()] === 0 || this.excludeDays[start.format("YYYYMMDD")]) {
      start.add(1, "days");
    }

    // skip backward to the first day the schedule is operating
    while (days[end.day()] === 0  || this.excludeDays[end.format("YYYYMMDD")]) {
      end.subtract(1, "days");
    }

    return new ScheduleCalendar(
      start,
      end,
      days,
      this.bankHoliday,
      this.extractExcludeDays(start, end)
    );
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

  private extractExcludeDays(from: Moment, until: Moment): ExcludeDays {
    return Object
      .values(this.excludeDays)
      .filter(d => d.isBetween(from, until, "days", "[]"))
      .reduce((days: ExcludeDays, day: Moment) => { days[day.format("YYYYMMDD")] = day; return days; }, {});
  }

  /**
   * Convert to a GTFS Calendar object
   */
  public toCalendar(serviceId: string): Calendar {
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
  public toCalendarDates(serviceId: string): CalendarDate[] {
    return Object.values(this.excludeDays).map(d => {
      return {
        service_id: serviceId,
        date: d.format("YYYYMMDD"),
        exception_type: 2
      };
    });
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