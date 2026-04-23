import {
  DaysOfWeek,
  Holiday,
  OperatingProfile,
  RouteLinks,
  Service, StopActivity,
  JPTimingLink,
  TransXChange, VehicleJourney,
  VJTimingLink,
  JPJourneyStop,
  VJJourneyStop,
  TimingStatus,
  RouteLink
} from "./TransXChange";
import {Transform, TransformCallback} from "stream";
import autobind from "autobind-decorator";
import {LocalDate, LocalTime, Duration, DateTimeFormatter} from "@js-joda/core";
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
      try {
        this.processVehicle(schedule, vehicle);
      } catch (err) {
        console.log(err);
      }
    }

    callback();
  }

  private mergeJourneyStop(jp: JPJourneyStop, vj?: VJJourneyStop): JPJourneyStop {
    // Inheritance
    if (!vj) {
      return jp;
    }

    return {
      Activity: vj.Activity ?? jp.Activity,
      StopPointRef: jp.StopPointRef,
      TimingStatus: jp.TimingStatus,
      WaitTime: vj.WaitTime ?? jp.WaitTime,
      DynamicDestinationDisplay: jp.DynamicDestinationDisplay
    };
  }

  private mergeTimingLinks(jp: JPTimingLink, vj: VJTimingLink): JPTimingLink {
    // Inheritance
    return {
      From: this.mergeJourneyStop(jp.From, vj.From),
      To: this.mergeJourneyStop(jp.To, vj.To),
      RunTime: vj.RunTime ?? jp.RunTime,
      RouteLinkRef: jp.RouteLinkRef
    };
  }


  private processVehicle(schedule: TransXChange, vehicle: VehicleJourney) {
    const service = schedule.Services[vehicle.ServiceRef];
    const journeyPattern = service.StandardService[vehicle.JourneyPatternRef];

    if (!journeyPattern) {
      console.log(`Warning: missing ${vehicle.JourneyPatternRef} on ${vehicle.ServiceRef}`);
      return;
    }

    const headsign = journeyPattern.DestinationDisplay || service.ServiceDestination;

    // Preserve the original order of the timing links from the journey pattern
    const sections = journeyPattern.Sections.flatMap(s => schedule.JourneySections[s] || []);

    if (vehicle.TimingLinks) {
      // TODO: Time complexity?
      for (const tl of vehicle.TimingLinks) {
        const jp = schedule.JPTimingLinks[tl.JPTimingLinkRef];

        // Find and merge
        const sectionIndex = sections.findIndex(s => s.RouteLinkRef === jp.RouteLinkRef);
        if (sectionIndex !== -1) {
          sections[sectionIndex] = this.mergeTimingLinks(sections[sectionIndex], tl);
        }
      }
    }

    if (sections.length > 0 && vehicle.OperatingProfile) {
      const calendar = this.getCalendar(vehicle.OperatingProfile, schedule.Services[vehicle.ServiceRef]);
      const stops = this.getStopTimes(schedule.RouteLinks, sections, vehicle.DepartureTime, headsign);
      const route = vehicle.ServiceRef + '|' + vehicle.LineRef;
      const blockId = vehicle.OperationalBlockNumber;
      const routeLinkIds = sections.map(tl => tl.RouteLinkRef);
      const routeLinks = routeLinkIds.map(rl => schedule.RouteLinks[rl]);
      const trip = {
        id: this.tripId++,
        shortName: journeyPattern.Direction === "outbound"
          ? service.ServiceDestination || service.Description
          : service.ServiceOrigin || service.Description,
        direction: journeyPattern.Direction,
        headsign
      };

      this.push({calendar, stops, trip, route, blockId, routeLinkIds, routeLinks} as TransXChangeJourney);
    }
  }

  private getCalendar(operatingProfile: OperatingProfile, service: Service): JourneyCalendar {
    const days: DaysOfWeek = operatingProfile.RegularDayType === "HolidaysOnly"
      ? [0, 0, 0, 0, 0, 0, 0]
      : this.mergeDays(operatingProfile.RegularDayType);

    let startDate = service.OperatingPeriod.StartDate;
    let endDate = service.OperatingPeriod.EndDate;
    const excludes = [];
    const includes = [];

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
      excludes.push(...this.getHoliday(holiday, startDate, endDate));
    }

    for (const holiday of operatingProfile.BankHolidayOperation.DaysOfOperation) {
      includes.push(...this.getHoliday(holiday, startDate, endDate));
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

  private getHoliday(holiday: Holiday, startDate: LocalDate, endDate: LocalDate): LocalDate[] {
    return (this.holidays[holiday] || []).filter(date => !date.isBefore(startDate) && !date.isAfter(endDate));
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

  private getStopTimes(routeLinksById: RouteLinks, links: JPTimingLink[], departureTime: LocalTime, defaultHeadsign: string): StopTime[] {
    // Don't include the headsign in every stop time if it's the same as the default
    const excludeIfDefault = (headsign?: string) => headsign === defaultHeadsign ? undefined : headsign;

    const stops: StopTime[] = [{
      stop: links[0].From.StopPointRef,
      arrivalTime: departureTime.format(DateTimeFormatter.ofPattern("HH:mm:ss")),
      departureTime: departureTime.format(DateTimeFormatter.ofPattern("HH:mm:ss")),
      headsign: excludeIfDefault(links[0].From.DynamicDestinationDisplay),
      pickup: true,
      dropoff: false,
      exactTime: links[0].From.TimingStatus === TimingStatus.PrincipalTimingPoint,
      shapeDistTraveled: 0
    }];

    let lastDepartureTime = Duration.between(LocalTime.parse("00:00"), departureTime);
    let distanceSoFarM = 0;

    for (const link of links) {
      if (link.From.WaitTime) {
        lastDepartureTime = lastDepartureTime.plusDuration(link.From.WaitTime);
        stops[stops.length - 1].departureTime = this.getTime(lastDepartureTime);
      }

      const arrivalTime = lastDepartureTime.plusDuration(link.RunTime);
      lastDepartureTime = link.To.WaitTime ? arrivalTime.plusDuration(link.To.WaitTime) : arrivalTime;

      const routeLink = routeLinksById[link.RouteLinkRef];
      distanceSoFarM += routeLink.Distance;

      stops.push({
        stop: link.To.StopPointRef,
        arrivalTime: this.getTime(arrivalTime),
        departureTime: this.getTime(lastDepartureTime),
        headsign: excludeIfDefault(link.To.DynamicDestinationDisplay),
        pickup: link.To.Activity === StopActivity.PickUp || link.To.Activity === StopActivity.PickUpAndSetDown,
        dropoff: link.To.Activity === StopActivity.SetDown || link.To.Activity === StopActivity.PickUpAndSetDown,
        exactTime: link.To.TimingStatus === TimingStatus.PrincipalTimingPoint,
        shapeDistTraveled: distanceSoFarM / 1000
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
    direction: "inbound" | "outbound",
    headsign: string
  }
  route: string,
  stops: StopTime[],
  blockId?: string,
  routeLinkIds: string[],
  routeLinks: RouteLink[],
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
  headsign?: string,
  pickup: boolean,
  dropoff: boolean,
  exactTime: boolean,
  shapeDistTraveled: number
}
