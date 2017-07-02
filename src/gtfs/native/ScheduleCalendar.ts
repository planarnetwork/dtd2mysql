
import {Moment} from "moment";
import memoize = require("memoized-class-decorator");
import moment = require("moment");
import {Calendar} from "../file/Calendar";
import {CalendarDate} from "../file/CalendarDate";

export class ScheduleCalendar {

  constructor(
    public readonly runsFrom: Moment,
    public readonly runsTo: Moment,
    public readonly days: Days,
    public readonly bankHoliday: 0 | 1,
    public readonly excludeDays: ExcludeDays = {}
  )  { }

  @memoize
  public get id() {
    return this.runsFrom.format("YYYYMMDD") + this.runsTo.format("YYYYMMDD") + this.bankHoliday + Object.values(this.days).join("") + Object.keys(this.excludeDays).join("");
  }

  @memoize
  public get binaryDays(): number {
    return parseInt(Object.values(this.days).join(""), 2);
  }

  /**
   * Returns true if this calendar is inside the date range of the given calendar
   */
  public overlaps(calendar: ScheduleCalendar): boolean {
    return (this.binaryDays & calendar.binaryDays) > 0 &&
           (this.runsFrom.isSameOrAfter(calendar.runsFrom) && this.runsFrom.isSameOrBefore(calendar.runsTo) ||
            this.runsTo.isSameOrBefore(calendar.runsTo) && this.runsTo.isSameOrAfter(calendar.runsFrom));
  }

  /**
   * Is the timeband short
   *
   * todo the length of the overlap between two bands should be considered rather than the length of the band
   */
  @memoize
  public get isShort(): boolean {
    return this.runsTo.diff(this.runsFrom, "days") < 5;
  }

  /**
   * Add each date in the range as an exclude day
   */
  public addExcludeDays(calendar: ScheduleCalendar): ScheduleCalendar[] {
    const startDate = moment.max(this.runsFrom, calendar.runsFrom).clone();
    const endDate = moment.min(this.runsTo, calendar.runsTo);

    while (startDate.isSameOrBefore(endDate)) {
      if (this.days[startDate.day()]) {
        this.excludeDays[startDate.format("YYYYMMDD")] = startDate.clone();
      }

      startDate.add(1, "days");
    }

    return [this];
  }

  /**
   * Remove the given date range from this calendar and return one or two calendars
   */
  public divideAround(calendar: ScheduleCalendar): ScheduleCalendar[] {
    const calendars: ScheduleCalendar[] = [];

    if (this.runsFrom.isBefore(calendar.runsFrom)) {
      const start = this.runsFrom;
      const end = calendar.runsFrom.clone().subtract(1, "days");

      // go back to the earliest valid date
      while (this.days[end.day()] === 0) end.subtract(1, "days");

      calendars.push(new ScheduleCalendar(start, end, this.days, this.bankHoliday, this.extractExcludeDays(start, end)));
    }

    if (this.runsTo.isAfter(calendar.runsTo)) {
      const start = calendar.runsTo.clone().add(1, "days");
      const end = this.runsTo;

      // go forward to the earliest valid date
      while (this.days[start.day()] === 0) start.add(1, "days");

      calendars.push(new ScheduleCalendar(start, end, this.days, this.bankHoliday, this.extractExcludeDays(start, end)));
    }

    return calendars;
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

type ExcludeDays = {
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

