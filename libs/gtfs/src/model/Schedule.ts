import {StopTime} from "../entity/StopTime";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../entity/Trip";
import {Route, RouteType} from "../entity/Route";
import {AgencyID} from "../entity/Agency";
import {CRS} from "../entity/Stop";
import {OverlayRecord, RSID, STP, TUID} from "./OverlayRecord";
import {toYYYYMMDD} from "./PlainDate";

/**
 * The identifier for a trip, stable across data revisions.
 *
 * The STP indicator is deliberately left out, so that when an overlay covering a whole permanent
 * schedule is withdrawn the trip keeps its ID and reads as an amended timetable rather than one
 * trip disappearing and another appearing.
 */
export function tripId(tuid: TUID, calendar: ScheduleCalendar): string {
  return `${tuid}_${toYYYYMMDD(calendar.runsFrom)}_${toYYYYMMDD(calendar.runsTo)}`;
}

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
    public readonly stp: STP,
    public readonly firstClassAvailable: boolean,
    public readonly reservationPossible: boolean
  ) {}
  
  public get tripId(): string {
    return tripId(this.tuid, this.calendar);
  }

  public get origin(): CRS {
    return this.stopTimes[0].stop_id;
  }

  public get destination(): CRS {
    return this.stopTimes[this.stopTimes.length - 1].stop_id;
  }

  /**
   * Clone the current record with the new calendar and id.
   *
   * The stop times are copied because callers shift the times of a clone in place.
   */
  public clone(calendar: ScheduleCalendar, scheduleId: number): Schedule {
    return new Schedule(
      scheduleId,
      this.stopTimes.map(st => Object.assign({}, st)),
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
   * Convert to a GTFS Trip.
   *
   * The headsign is what a passenger reads on the front of the train, so it is
   * where the train is going. `destination` is the name of the last stop, which
   * the caller has and this does not.
   *
   * `wheelchair_accessible` and `bikes_allowed` are both 0, which in GTFS means
   * "no information". Nothing in the DTD feed says otherwise, and claiming
   * either way would be inventing an answer.
   */
  public toTrip(serviceId: number, routeId: number, destination: string): Trip {
    return {
      route_id: routeId,
      service_id: serviceId,
      trip_id: this.stopTimes[0].trip_id,
      trip_headsign: destination,
      trip_short_name: this.rsid,
      direction_id: 0,
      wheelchair_accessible: 0,
      bikes_allowed: 0
    };
  }

  /**
   * What makes two schedules the same route: who runs it, where it goes between
   * and how. Routes are numbered from a sort of this, so the number does not
   * depend on which trip reached the route first.
   */
  public get routeShortName(): string {
    return `${this.operator || "Z"}:${this.origin}->${this.destination}:${this.mode}`;
  }

  /**
   * Convert to GTFS Route. The caller numbers it.
   */
  public toRoute(): Route {
    return {
      route_id: this.id,
      agency_id: this.operator || "ZZ",
      route_short_name: this.routeShortName,
      route_long_name: `${this.operator || "Z"} ${this.modeDescription.toLowerCase()} service from ${this.origin} to ${this.destination}`,
      route_type: this.mode,
      route_text_color: null,
      route_color: null,
      route_url: null,
      route_desc: [this.modeDescription, this.classDescription, this.reservationDescription].join(". ")
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
    return <StopTime>this.stopTimes.find(s => s.stop_id === location);
  }

}

