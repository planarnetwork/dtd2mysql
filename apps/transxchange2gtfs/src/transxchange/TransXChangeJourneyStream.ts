import {
  DaysOfWeek,
  Holiday,
  OperatingProfile,
  Service, StopActivity,
  TimingLink,
  TransXChange
} from "./TransXChange";
import {Transform, TransformCallback} from "stream";
import autobind from "autobind-decorator";
import {LocalDate, LocalTime, Duration, DateTimeFormatter} from "js-joda";
import {ATCOCode} from "../reference/NaPTAN";

/**
 * Transforms TransXChange objects into TransXChangeJourneys that are closer to GTFS calendars, calendar dates, trips
 * and stop times.
 */
@autobind
export class TransXChangeJourneyStream extends Transform {
  private calendars: Record<string, JourneyCalendar> = {};
  private serviceId: number = 1;
  private tripId: number = 1;

  constructor(private readonly holidays: BankHolidays) {
    super({ objectMode: true });
  }

  /**
   * Generate a journey
   */
  public _transform(schedule: TransXChange, encoding: string, callback: TransformCallback): void {

    for (const vehicle of schedule.VehicleJourneys) {
      const service = schedule.Services[vehicle.ServiceRef];
      const journeyPattern = service.StandardService[vehicle.JourneyPatternRef];

      if (!journeyPattern) {
        console.log(`Warning: missing ${vehicle.JourneyPatternRef} on ${vehicle.ServiceRef}`);
        continue;
      }

      const sections = journeyPattern.Sections.reduce(
          (acc, s) => acc.concat(schedule.JourneySections[s]),
          [] as TimingLink[]
      );

      if (sections.length > 0) {
        const calendar = this.getCalendar(vehicle.OperatingProfile, schedule.Services[vehicle.ServiceRef]);
        const stops = this.getStopTimes(sections, vehicle.DepartureTime);
        const route = vehicle.ServiceRef;
        const trip = {
          id: this.tripId++,
          shortName: journeyPattern.Direction === "outbound"
            ? service.ServiceDestination
            : service.ServiceOrigin,
          direction: journeyPattern.Direction
        };

        this.push({calendar, stops, trip, route});
      }
    }

    callback();
  }

  private getCalendar(operatingProfile: OperatingProfile, service: Service): JourneyCalendar {
    const days: DaysOfWeek = operatingProfile.RegularDayType === "HolidaysOnly"
      ? [0, 0, 0, 0, 0, 0, 0]
      : this.mergeDays(operatingProfile.RegularDayType);

    let startDate = service.OperatingPeriod.StartDate;
    let endDate = service.OperatingPeriod.EndDate;
    let excludes = [];
    let includes = [];

    for (const dates of operatingProfile.SpecialDaysOperation.DaysOfNonOperation) {
      // if the start date of the non-operation is on or before the start of the service date, change the calendar start date
      if (!dates.StartDate.isAfter(startDate)) {
        startDate = dates.EndDate.plusDays(1);
      }
      // if the end date of the non-operation is on or after the end of the service date, change the calendar end date
      else if (!dates.EndDate.isBefore(endDate) || dates.EndDate.year() >= 2037) {
        endDate = dates.StartDate.minusDays(1);
      }
      else if (dates.EndDate.toEpochDay() - dates.StartDate.toEpochDay() < 92) {
        excludes.push(...this.dateRange(dates.StartDate, dates.EndDate, days));
      }
      else {
        console.log("Warning: Ignored extra long break in service", dates, JSON.stringify(service));
      }
    }

    for (const holiday of operatingProfile.BankHolidayOperation.DaysOfNonOperation) {
      excludes.push(...this.getHoliday(holiday, startDate));
    }

    for (const holiday of operatingProfile.BankHolidayOperation.DaysOfOperation) {
      includes.push(...this.getHoliday(holiday, startDate));
    }

    const hash = this.getCalendarHash(days, startDate, endDate, includes, excludes);

    if (!this.calendars[hash]) {
      const id = this.serviceId++;
      this.calendars[hash] = { id, startDate, endDate, days, includes, excludes };
    }

    return this.calendars[hash];
  }

  private mergeDays(daysOfOperation: DaysOfWeek[]): DaysOfWeek {
    return daysOfOperation.reduce(
      (result, days) => result.map((day, index) => day || days[index]) as DaysOfWeek,
      [0, 0, 0, 0, 0, 0, 0]
    );
  }

  private dateRange(from: LocalDate, to: LocalDate, days: DaysOfWeek, dates: LocalDate[] = []): LocalDate[] {
    if (from.isAfter(to)) {
      return dates;
    }
    else if (days[from.dayOfWeek().value() - 1]) {
      return this.dateRange(from.plusDays(1), to, days, [...dates, from]);
    }
    else {
      return this.dateRange(from.plusDays(1), to, days, dates);
    }
  }

  private getHoliday(holiday: Holiday, startDate: LocalDate): LocalDate[] {
    return (this.holidays[holiday] || []).filter(date => date.isAfter(startDate));
  }

  private getCalendarHash(days: DaysOfWeek,
                          startDate: LocalDate,
                          endDate: LocalDate,
                          includes: LocalDate[],
                          excludes: LocalDate[]): string {
    return [
      days.toString(),
      startDate.toString(),
      endDate.toString(),
      includes.map(d => d.toString()).join(),
      excludes.map(d => d.toString()).join()
    ].join("_");
  }

  private getStopTimes(links: TimingLink[], departureTime: LocalTime): StopTime[] {
    const stops = [{
      stop: links[0].From.StopPointRef,
      arrivalTime: departureTime.format(DateTimeFormatter.ofPattern("HH:mm:ss")),
      departureTime: departureTime.format(DateTimeFormatter.ofPattern("HH:mm:ss")),
      pickup: true,
      dropoff: false,
      exactTime: links[0].From.TimingStatus === "PTP"
    }];

    let lastDepartureTime = Duration.between(LocalTime.parse("00:00"), departureTime);

    for (const link of links) {
      const arrivalTime = lastDepartureTime.plusDuration(link.RunTime);
      lastDepartureTime = link.To.WaitTime ? arrivalTime.plusDuration(link.To.WaitTime) : arrivalTime;

      stops.push({
        stop: link.To.StopPointRef,
        arrivalTime: this.getTime(arrivalTime),
        departureTime: this.getTime(lastDepartureTime),
        pickup: link.To.Activity === StopActivity.PickUp || link.To.Activity === StopActivity.PickUpAndSetDown,
        dropoff: link.To.Activity === StopActivity.SetDown || link.To.Activity === StopActivity.PickUpAndSetDown,
        exactTime: link.To.TimingStatus === "PTP"
      });
    }

    return stops;
  }

  private getTime(time: Duration): string {
    const hour = time.toHours().toString().padStart(2, "0");
    const minute = (time.toMinutes() % 60).toString().padStart(2, "0");

    return hour + ":" + minute + ":00";
  }
}

export type BankHolidays = Record<Holiday, LocalDate[]>;

export interface TransXChangeJourney {
  calendar: JourneyCalendar
  trip: {
    id: number,
    shortName: string,
    direction: "inbound" | "outbound"
  }
  route: string,
  stops: StopTime[]
}

export interface JourneyCalendar {
  id: number,
  startDate: LocalDate,
  endDate: LocalDate,
  days: DaysOfWeek,
  includes: LocalDate[],
  excludes: LocalDate[]
}

export interface StopTime {
  stop: ATCOCode,
  arrivalTime: string,
  departureTime: string,
  pickup: boolean,
  dropoff: boolean,
  exactTime: boolean
}
