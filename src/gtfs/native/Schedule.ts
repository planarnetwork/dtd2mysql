
import {StopTime} from "../file/StopTime";
import {OverlapType, ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../file/Trip";
import {Route, RouteType} from "../file/Route";
import {AgencyID} from "../file/Agency";
import {CRS} from "../file/Stop";
import {IdGenerator, OverlayRecord, RSID, STP, TUID} from "./OverlayRecord";

/**
 * A CIF schedule (BS record)
 */
export class Schedule implements OverlayRecord {

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

  public get hash(): string {
    return this.tuid + this.stopTimes.map(s => s.stop_id + s.departure_time + s.arrival_time).join("") + this.calendar.binaryDays;
  }

  /**
   * Clone the current record with the new calendar and id
   */
  public clone(calendar: ScheduleCalendar, scheduleId: number): Schedule {
    return new Schedule(
      scheduleId,
      this.stopTimes.map(st => Object.assign({}, st, { trip_id: scheduleId })),
      this.tuid,
      this.rsid,
      calendar,
      this.mode,
      this.operator,
      this.stp
    );
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

}

