import {CalendarDateRow, CalendarRow, RowWriter} from "@gb-transit/gtfs-schema";
import {CalendarFactory} from "../calendar/CalendarFactory";
import {MemoizedSequence} from "../../sequence/MemoizedSequence";
import {close, push} from "./Push";

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
   * Two services that run on the same days between the same dates, with the same
   * exceptions, are the same service however the feeds numbered them.
   */
  private getCalendarHash(calendar: CalendarRow, calendarDates: CalendarDateRow[]): string {
    const {service_id, ...rest} = calendar;
    const days = calendarDates.map(d => d.date + "_" + d.exception_type).join(":");
    const fields = Object.values({days, ...rest});

    return fields.join();
  }

  public async end(): Promise<void> {
    await Promise.all([close(this.calendar), close(this.calendarDates)]);
  }

}

export type ServiceIDMap = Record<string, number>;
