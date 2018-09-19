import {GTFSFileStream} from "./GTFSFileStream";
import {Holiday, DaysOfWeek, IntBool, OperatingProfile, Service, TransXChange} from "../transxchange/TransXChange";
import {LocalDate} from "js-joda";

/**
 * Extract the calendars from the TransXChange services
 */
export class CalendarStream extends GTFSFileStream {
  private datesSeen: Record<string, number> = {};
  private currentId: number = 1;

  protected header = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date";

  constructor(private readonly holidays: BankHolidays) {
    super();
  }

  protected transform(schedule: TransXChange): void {
    for (const vehicle of schedule.VehicleJourneys) {
      this.addCalendar(vehicle.OperatingProfile, schedule.Services[vehicle.ServiceRef]);
    }
  }

  private addCalendar(operatingProfile: OperatingProfile, service: Service) {
    const days = operatingProfile.RegularDayType === "HolidaysOnly"
      ? [0, 0, 0, 0, 0, 0, 0].join()
      : this.mergeDays(operatingProfile.RegularDayType).join();

    let startDate = service.OperatingPeriod.StartDate;
    let endDate = service.OperatingPeriod.EndDate;
    let excludes = [];
    let includes = [];

    for (const dates of operatingProfile.SpecialDaysOperation.DaysOfNonOperation) {
      if (dates.StartDate.isEqual(startDate)) {
        startDate = dates.EndDate.plusDays(1);
      }
      else if (dates.EndDate.isEqual(endDate)) {
        endDate = dates.StartDate.minusDays(1);
      }
      else {
        excludes.push(...this.dateRange(dates.StartDate, dates.EndDate));
      }
    }

    for (const holiday of operatingProfile.BankHolidayOperation.DaysOfNonOperation) {
      excludes.push(...this.getHoliday(holiday, startDate));
    }

    for (const holiday of operatingProfile.BankHolidayOperation.DaysOfOperation) {
      includes.push(...this.getHoliday(holiday, startDate));
    }

    const id = this.getCalendarId(days, startDate, endDate, includes, excludes);

    if (!this.datesSeen[id]) {
      this.datesSeen[id] = this.currentId++;
      this.push(`${this.datesSeen[id]},${days},${startDate},${endDate}`);
    }
  }

  private mergeDays(daysOfOperation: DaysOfWeek[]): DaysOfWeek {
    return daysOfOperation.reduce(
      (result: DaysOfWeek, days: DaysOfWeek) => result.map((d: IntBool, i: number) => d || days[i]) as DaysOfWeek,
      [0, 0, 0, 0, 0, 0, 0]
    );
  }

  private dateRange(from: LocalDate, to: LocalDate, dates: LocalDate[] = []): LocalDate[] {
    return from.isAfter(to) ? dates : this.dateRange(from.plusDays(1), to, [...dates, from.plusDays(1)]);
  }

  private getHoliday(holiday: Holiday, after: LocalDate): LocalDate[] {
    return this.holidays[holiday].find(dates => dates[0].isAfter(after)) || [];
  }

  private getCalendarId(days: string,
                        startDate: LocalDate,
                        endDate: LocalDate,
                        includes: LocalDate[],
                        excludes: LocalDate[]): string {
    return [
      days,
      startDate.toString(),
      endDate.toString(),
      includes.map(d => d.toString()).join(),
      excludes.map(d => d.toString()).join()
    ].join("_");
  }
}

export type BankHolidays = Record<Holiday, LocalDate[][]>;