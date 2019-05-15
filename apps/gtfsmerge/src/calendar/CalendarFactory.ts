import {Calendar, CalendarDate} from "../GTFS";

/**
 * Creates calendars based on a set of calendar dates.
 */
export class CalendarFactory {

  /**
   * Count the number of times a service runs or does not run on each day of the week and then decide whether to
   * create a calendar with that day enabled with exclude days when it is not running, or disabled with include
   * days when it is running.
   */
  public create(serviceId: string, calendarDates: CalendarDate[]): [Calendar, CalendarDate[]] {
    calendarDates.sort((a, b) => +a.date - +b.date);

    const startDate = calendarDates[0];
    const endDate = calendarDates[calendarDates.length - 1];
    const [daysRunning, daysNotRunning] = this.splitCalendarDates(calendarDates, serviceId, startDate, endDate);
    const calendar = this.createCalendar(serviceId, startDate, endDate, daysRunning, daysNotRunning);
    const newCalendarDates = this.getCalendarDates(daysRunning, daysNotRunning);

    return [calendar, newCalendarDates];
  }

  private splitCalendarDates(
    calendarDates: CalendarDate[],
    serviceId: string,
    startDate: CalendarDate,
    endDate: CalendarDate
  ): [CalendarDate[][], CalendarDate[][]] {

    const daysNotRunning: CalendarDate[][] = [[], [], [], [], [], [], []];
    const daysRunning: CalendarDate[][] = [[], [], [], [], [], [], []];
    const calendarDateIndex = this.indexCalendarDates(calendarDates);

    let i = startDate.date;
    let date = this.getDateFromGTFSString(i);

    while (i <= endDate.date) {
      const dow = date.getDay();

      if (calendarDateIndex[i]) {
        daysRunning[dow].push({ exception_type: 1, service_id: serviceId, date: i });
      }
      else {
        daysNotRunning[dow].push({ exception_type: 2, service_id: serviceId, date: i });
      }

      date.setDate(date.getDate() + 1);
      i = this.getGTFSDateString(date);
    }

    return [daysRunning, daysNotRunning];
  }

  private indexCalendarDates(calendarDates: CalendarDate[]): Record<string, CalendarDate> {
    return calendarDates.reduce((index, calendarDate) => {
      index[calendarDate.date] = calendarDate;

      return index;
    }, {});
  }

  private getGTFSDateString(date: Date): string {
    return date.getFullYear()
      + (date.getMonth() + 1).toString().padStart(2, "0")
      + date.getDate().toString().padStart(2, "0");
  }

  private getDateFromGTFSString(i: string): Date {
    return new Date(i.substr(0, 4) + "-" + i.substr(4, 2) + "-" + i.substr(6, 2));
  }

  private createCalendar(
    serviceId: string,
    startDate: CalendarDate,
    endDate: CalendarDate,
    daysRunning: CalendarDate[][],
    daysNotRunning: CalendarDate[][]
  ): Calendar {
    return {
      service_id: serviceId,
      start_date: startDate.date,
      end_date: endDate.date,
      sunday: daysRunning[0].length > daysNotRunning[0].length ? 1 : 0,
      monday: daysRunning[1].length > daysNotRunning[1].length ? 1 : 0,
      tuesday: daysRunning[2].length > daysNotRunning[2].length ? 1 : 0,
      wednesday: daysRunning[3].length > daysNotRunning[3].length ? 1 : 0,
      thursday: daysRunning[4].length > daysNotRunning[4].length ? 1 : 0,
      friday: daysRunning[5].length > daysNotRunning[5].length ? 1 : 0,
      saturday: daysRunning[6].length > daysNotRunning[6].length ? 1 : 0
    };
  }

  /**
   * For each day of the week check if the service runs more often than not. If it does, return the exclude days as
   * the calendar will have the day set to 1, if not then return the include days.
   */
  private getCalendarDates(daysRunning: CalendarDate[][], daysNotRunning: CalendarDate[][]): CalendarDate[] {
    return daysRunning.flatMap((runningDates, i) => {
      return runningDates.length > daysNotRunning[i].length ? daysNotRunning[i] : runningDates;
    });
  }

}
