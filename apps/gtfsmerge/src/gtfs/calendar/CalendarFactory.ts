import {CalendarDateRow as CalendarDate, CalendarRow as Calendar} from "@gb-transit/gtfs-schema";
import {addDays, getDayOfWeek} from "@gb-transit/gtfs-loader";

/** Sunday first, as JavaScript numbers the days and as getDayOfWeek returns them. */
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/**
 * Creates calendars based on a set of calendar dates.
 *
 * A service the feed describes only by its exception dates has no calendar row
 * to carry into the merged feed, so one is worked out from the dates: for each
 * day of the week, does it run more often than not? The days it runs more often
 * than not are the calendar, and the days that disagree with it are written back
 * out as exceptions, so the service runs on exactly the dates it did.
 */
export class CalendarFactory {

  /**
   * The dates given are the ones the feed listed, and a feed lists both the
   * dates a service runs and the dates it does not. Only the first kind is a
   * date the service runs on; a removal is the absence of one, and is why the
   * calendar this returns may exclude a date the calendar's own days include.
   */
  public create(
    serviceId: string,
    calendarDates: CalendarDate[]
  ): [Calendar, CalendarDate[]] {
    const runs = new Set(
      calendarDates.filter(date => Number(date.exception_type) === 1).map(date => String(date.date))
    );

    // Told only when it does not run, a service never runs. It gets a calendar
    // of no days rather than no calendar, because something has to carry the id
    // the trips are indexed against - and CalendarMerger drops a service that
    // runs on nothing, along with those trips.
    if (runs.size === 0) {
      return [this.neverRuns(serviceId, calendarDates), []];
    }

    const dates = [...runs].sort();
    const [daysRunning, daysNotRunning] = this.splitCalendarDates(
      serviceId, runs, dates[0], dates[dates.length - 1]
    );

    return [
      this.createCalendar(serviceId, dates[0], dates[dates.length - 1], daysRunning, daysNotRunning),
      this.getCalendarDates(daysRunning, daysNotRunning)
    ];
  }

  /**
   * Every date between the first and the last the service runs, split by day of
   * the week into the ones it runs on and the ones it does not.
   *
   * A date the feed removed is in neither list as a removal: it is simply not a
   * date the service runs, which is what a removal means. Dates outside the
   * range are dropped, because the calendar does not reach them.
   */
  private splitCalendarDates(
    serviceId: string,
    runs: Set<string>,
    startDate: string,
    endDate: string
  ): [CalendarDate[][], CalendarDate[][]] {
    const daysNotRunning: CalendarDate[][] = [[], [], [], [], [], [], []];
    const daysRunning: CalendarDate[][] = [[], [], [], [], [], [], []];

    for (let date = Number(startDate); date <= Number(endDate); date = addDays(date, 1)) {
      const on = runs.has(String(date));
      const into = on ? daysRunning : daysNotRunning;

      into[getDayOfWeek(date)].push({
        exception_type: on ? 1 : 2,
        service_id: serviceId,
        date: String(date)
      });
    }

    return [daysRunning, daysNotRunning];
  }

  private createCalendar(
    serviceId: string,
    startDate: string,
    endDate: string,
    daysRunning: CalendarDate[][],
    daysNotRunning: CalendarDate[][]
  ): Calendar {
    const calendar = {
      service_id: serviceId,
      start_date: startDate,
      end_date: endDate
    } as Calendar;

    for (let day = 0; day < DAYS.length; day++) {
      calendar[DAYS[day]] = daysRunning[day].length > daysNotRunning[day].length ? 1 : 0;
    }

    return calendar;
  }

  /**
   * A service whose every listed date is one it does not run on.
   *
   * The range is the dates it was told about, so the row says where in time the
   * service was meant to be even though it never operates.
   */
  private neverRuns(serviceId: string, calendarDates: CalendarDate[]): Calendar {
    const dates = calendarDates.map(date => String(date.date)).sort();
    const calendar = {
      service_id: serviceId,
      start_date: dates[0],
      end_date: dates[dates.length - 1]
    } as Calendar;

    for (const day of DAYS) {
      calendar[day] = 0;
    }

    return calendar;
  }

  /**
   * For each day of the week check if the service runs more often than not. If it does, return the exclude days as
   * the calendar will have the day set to 1, if not then return the include days.
   */
  private getCalendarDates(
    daysRunning: CalendarDate[][],
    daysNotRunning: CalendarDate[][]
  ): CalendarDate[] {
    return daysRunning.flatMap((runningDates, i) => {
      return runningDates.length > daysNotRunning[i].length
        ? daysNotRunning[i]
        : runningDates;
    });
  }
}
