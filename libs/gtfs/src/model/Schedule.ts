import {StopTime} from "../entity/StopTime";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../entity/Trip";
import {Route, RouteType} from "../entity/Route";
import {AgencyID} from "../entity/Agency";
import {CRS} from "../entity/Stop";
import {OverlayRecord, RSID, STP, TUID} from "./OverlayRecord";
import {toYYYYMMDD} from "./PlainDate";
import {agencyIndex} from "../data/agency";
import {accessibleTextColor, LineRule, lineRulesByOperator, routeBranding} from "../data/route";

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
    public readonly operator: AgencyID,
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
   * Clone the current record with the new calendar and id, and optionally a
   * different set of calls.
   *
   * The stop times are copied because callers shift the times of a clone in place.
   */
  public clone(calendar: ScheduleCalendar, scheduleId: number, stopTimes: StopTime[] = this.stopTimes): Schedule {
    return new Schedule(
      scheduleId,
      stopTimes.map(st => Object.assign({}, st)),
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
  public toTrip(serviceId: number, destination: string): Trip {
    return {
      route_id: this.routeId,
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
   * The route this schedule runs on: the brand a passenger sees rather than
   * anything the DTD feed names.
   *
   * Most operators run one brand and this is their ATOC code. The ones that run
   * several - London Underground, the Overground, Merseyrail, the Tyne & Wear
   * Metro, West Midlands Trains and Greater Anglia's Stansted Express - are told
   * apart by where the service goes, by the rules in `data/route.ts`.
   *
   * A route id is worked out from the schedule rather than handed out in the
   * order schedules arrive, so it is the same id in every build and can be
   * referred to from outside the feed.
   *
   * TODO: If it is a bus service and the actual route number is available in the
   * "headcode" field, use it.
   */
  private get bareRouteId(): string {
    const rules = lineRulesByOperator.get(this.operator);

    if (rules === undefined) {
      return this.operator;
    }

    // Built here rather than per rule: a service calls at a few dozen stations
    // and a line is recognised by asking about a few dozen more.
    const calls = new Set(this.stopTimes.map(stopTime => stopTime.stop_id));
    const matches = (rule: LineRule) =>
      (rule.between === undefined || rule.between.includes(this.origin) || rule.between.includes(this.destination))
      && (rule.calls === undefined || rule.calls.some(crs => calls.has(crs)));

    return rules.find(matches)?.line ?? this.operator;
  }

  /**
   * A bus does not run on the line its operator's trains do, so it is a route
   * of its own. Replacement buses are separated from scheduled ones because a
   * passenger reads them differently: one is the timetable, the other is what
   * happens when the timetable fails.
   */
  public get routeId(): string {
    switch (this.mode) {
      case RouteType.Bus: return `${this.bareRouteId}_BUS`;
      case RouteType.ReplacementBus: return `${this.bareRouteId}_RRB`;
      default: return this.bareRouteId;
    }
  }

  /**
   * Convert to GTFS Route.
   *
   * GTFS asks for a short name, a long name or both. The brand supplies what it
   * has; an operator with no brand entry falls back to the name its agency
   * record carries, as a long name, because an agency is named in full. The id
   * itself is the last resort, for an operator this build has never heard of.
   */
  public toRoute(): Route {
    const branding = routeBranding.get(this.bareRouteId);
    const agency = agencyIndex.get(this.operator);
    const longName = branding?.route_long_name
      ?? (branding?.route_short_name === undefined ? agency?.agency_name : undefined);
    const shortName = branding?.route_short_name
      ?? (longName === undefined ? this.bareRouteId : undefined);
    const color = branding?.route_color;

    return {
      route_id: this.routeId,
      agency_id: agency?.agency_id ?? "ZZ",
      route_short_name: shortName ?? null,
      route_long_name: longName ?? null,
      route_type: this.mode,
      route_text_color: color === undefined ? null : accessibleTextColor(color),
      route_color: color ?? null,
      route_url: branding?.route_url ?? null,
      // What the DTD says about a train - its class and whether it can be
      // reserved - is a property of the train, not of the line it runs on.
      // Flattening it onto the route made trips sharing a route disagree about
      // their own description, so it is left out.
      route_desc: null
    };
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

