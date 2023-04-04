
import {StopTime} from "../file/StopTime";
import {CIFRepository} from '../repository/CIFRepository';
import {OverlapType, ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../file/Trip";
import {Route, RouteType} from "../file/Route";
import {AgencyID} from "../file/Agency";
import {CRS} from "../file/Stop";
import {IdGenerator, OverlayRecord, RSID, STP, TUID} from "./OverlayRecord";
import * as memoize  from "memoized-class-decorator";

/**
 * A CIF schedule (BS record)
 */
export class Schedule implements OverlayRecord {

  constructor(
    public readonly id: number,
    public readonly stopTimes: StopTime[],
    public readonly tuid: TUID,
    public readonly rsid: RSID | null,
    public readonly calendar: ScheduleCalendar,
    public readonly mode: RouteType,
    public readonly operator: AgencyID | null,
    public readonly stp: STP,
    public readonly firstClassAvailable: boolean,
    public readonly reservationPossible: boolean
  ) {}

  public get origin(): CRS {
    return this.stopTimes[0].stop_id.substr(0, 3);
  }

  public get destination(): CRS {
    return this.stopTimes[this.stopTimes.length - 1].stop_id.substr(0, 3);
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
      this.stp,
      this.firstClassAvailable,
      this.reservationPossible
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
      trip_headsign: null,
      trip_short_name: this.rsid ?? this.tuid,
      direction_id: 0,
      wheelchair_accessible: 1,
      bikes_allowed: 0
    };
  }

  /**
   * Convert to GTFS Route
   */
  public async toRoute(cifRepository : CIFRepository): Promise<Route> {
    const stop_data = await cifRepository.getStops();
    const origin = stop_data.find(stop => stop.stop_code === this.origin)?.stop_name ?? this.origin;
    const destination = stop_data.find(stop => stop.stop_code === this.destination)?.stop_name ?? this.destination;
    return {
      route_id: this.id,
      agency_id: this.operator || "ZZ",
      route_short_name: this.rsid?.substr(0, 6) ?? this.tuid,
      route_long_name: `${origin} → ${destination}`,
      route_type: this.mode,
      route_text_color: null,
      route_color: null,
      route_url: null,
      route_desc: `${this.modeDescription} service from ${origin} to ${destination}, ${this.classDescription}, ${this.reservationDescription}`,
    };
  }

  private get modeDescription(): string {
    switch (this.mode) {
      case RouteType.Rail: return "Train";
      case RouteType.Subway: return "Underground";
      case RouteType.Tram: return "Tram";
      case RouteType.Bus: return "Bus";
      case RouteType.ReplacementBus: return "Replacement bus";
      case RouteType.Ferry: return "Boat";
      default: return "Train";
    }
  }

  private get classDescription(): string {
    return this.firstClassAvailable ? "First class available" : "Standard class only";
  }

  private get reservationDescription(): string {
    return this.reservationPossible ? "Reservation possible" : "Reservation not possible";
  }

  public before(location: CRS): StopTime[] {
    return this.stopTimes.slice(0, this.stopTimes.findIndex(s => s.stop_id === location));
  }

  public after(location: CRS): StopTime[] {
    return this.stopTimes.slice(this.stopTimes.findIndex(s => s.stop_id === location) + 1);
  }

  public stopAt(location: CRS): StopTime | undefined {
    return <StopTime>this.stopTimes.find(s => s.stop_id.substr(0, 3) === location);
  }

}

