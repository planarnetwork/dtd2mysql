
import {StopTime} from "../file/StopTime";
import {OverlapType, ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../file/Trip";
import {Route, RouteType} from "../file/Route";
import {AgencyID} from "../file/Agency";
import {CRS} from "../file/Stop";

/**
 * A CIF schedule (BS record)
 */
export class Schedule {

  constructor(
    public readonly id: number,
    public readonly stopTimes: StopTime[],
    public readonly tuid: TUID,
    public readonly rsid: RSID,
    public readonly calendar: ScheduleCalendar,
    public readonly mode: RouteType,
    public readonly operator: AgencyID | null,
    public readonly stp: STP
  ) {}

  public get origin(): CRS {
    return this.stopTimes[0].stop_id;
  }

  public get destination(): CRS {
    return this.stopTimes[this.stopTimes.length - 1].stop_id;
  }

  /**
   * Convert to a GTFS Trip
   */
  public toTrip(serviceId: string, routeId: number): Trip {
    return {
      route_id: routeId,
      service_id: serviceId,
      trip_id: this.id,
      trip_headsign: this.tuid,
      trip_short_name: this.rsid,
      direction_id: 0,
      block_id: "0",
      shape_id: "0",
      wheelchair_accessible: 0,
      bikes_allowed: 0
    };
  }

  /**
   * Convert to GTFS Route
   */
  public toRoute(): Route {
    return {
      route_id: this.id,
      agency_id: this.operator,
      route_short_name: `${this.operator}:${this.origin}->${this.destination}`,
      route_long_name: `${this.operator} service from ${this.origin} to ${this.destination}`,
      route_type: this.mode,
      route_text_color: null,
      route_color: null,
      route_url: null,
      route_desc: null
    };
  }

  /**
   * Check if the given schedule overlaps the current one and if necessary divide this schedule into many others.
   *
   * If there is no overlap this Schedule will be returned intact.
   */
  public applyOverlay(schedule: Schedule, ids: IdGenerator): Schedule[] {
    const overlap = this.calendar.getOverlap(schedule.calendar);

    // if this schedules schedule overlaps it at any point
    if (overlap === OverlapType.None) {
      return [this];
    }

    return overlap === OverlapType.Short
      ? this.calendar.addExcludeDays(schedule.calendar).map(calendar => this.clone(calendar, this.id))
      : this.calendar.divideAround(schedule.calendar).map(calendar => this.clone(calendar, ids.next().value));
  }

  private clone(calendar: ScheduleCalendar, scheduleId: number): Schedule {
    return new Schedule(
      scheduleId,
      this.stopTimes.map(st => Object.assign({}, st, {trip_id: scheduleId})),
      this.tuid,
      this.rsid,
      calendar,
      this.mode,
      this.operator,
      this.stp
    );
  }
}

export type TUID = string;
export type RSID = string;

export enum STP {
  Permanent = "P",
  Overlay = "O",
  New = "N",
  Cancellation = "C"
}

export type IdGenerator = IterableIterator<number>;