import { CalendarFactory } from "../calendar/CalendarFactory";
import { Calendar, CalendarDate, ServiceID } from "../GTFS";
import { Sequence } from "../../sequence/Sequence";
import { Writable } from "stream";

export class CalendarMerger {

  constructor(
    private readonly calendar: Writable,
    private readonly calendarDates: Writable,
    private readonly calendarFactory: CalendarFactory,
    private readonly serviceIdSequence: Sequence
  ) {}

  public async write(calendars: Calendar[], dateIndex: Record<ServiceID, CalendarDate[]>): Promise<ServiceIDMap> {
    const serviceIdMap = {};

    for (const calendar of calendars) {
      const calendarDates = dateIndex[calendar.service_id] || [];

      await this.writeCalendar(calendar, calendarDates, serviceIdMap);
    }

    // check for any calendar dates that have no calendar entry
    for (const serviceId of Object.keys(dateIndex)) {
      if (!serviceIdMap[serviceId]) {
        const [calendar, calendarDates] = this.calendarFactory.create(serviceId, dateIndex[serviceId]);

        await this.writeCalendar(calendar, calendarDates, serviceIdMap);
      }
    }

    return serviceIdMap;
  }

  private async writeCalendar(calendar: Calendar, calendarDates: CalendarDate[], serviceIdMap: {}): Promise<void> {
    const hash = this.getCalendarHash(calendar, calendarDates);
    const alreadySeenCalendar = this.serviceIdSequence.haveSeen(hash);
    const newServiceId = this.serviceIdSequence.get(hash);

    if (!alreadySeenCalendar) {
      calendar.service_id = newServiceId;
      await this.push(this.calendar, calendar);

      for (const calendarDay of calendarDates) {
        calendarDay.service_id = newServiceId;
        await this.push(this.calendarDates, calendarDay);
      }
    }

    serviceIdMap[calendar.service_id] = this.serviceIdSequence.get(hash);
  }

  private getCalendarHash(calendar: Calendar, calendarDates: CalendarDate[]): string {
    const { service_id, ...rest } = calendar;
    const days = calendarDates.map(d => d.date + "_" + d.exception_type).join(":");
    const fields = Object.values({ days, ...rest });

    return fields.join();
  }

  private push(stream: Writable, data: any): Promise<void> | void {
    const writable = stream.write(data);

    if (!writable) {
      return new Promise(resolve => stream.once("drain", () => resolve()));
    }
  }

  /**
   * Flush all the data to the output stream
   */
  public async end(): Promise<void[]> {
    return Promise.all([
      new Promise(resolve => this.calendar.end(resolve)),
      new Promise(resolve => this.calendarDates.end(resolve))
    ]);
  }

}

export type ServiceIDMap = Record<number, number>;
