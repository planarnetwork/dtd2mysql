import {CRS} from "../file/Stop";
import {RouteType, Route} from "../file/Route";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../file/Trip";
import memoize = require("memoized-class-decorator");
import {Frequency} from "../command/Frequency";
import {StopTime} from "../file/StopTime";
import {Duration, formatDuration} from "./Duration";

/**
 * ALF entry
 */
export class FixedLink {

  constructor(
    public readonly origin: CRS,
    public readonly destination: CRS,
    public readonly mode: RouteType,
    public readonly duration: Duration,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly calendar: ScheduleCalendar
  ) {}

  @memoize
  public get modeDescription(): string {
    switch (this.mode) {
      case RouteType.Rail: return "Train";
      case RouteType.Subway: return "Underground";
      case RouteType.Tram: return "Tram";
      case RouteType.Bus: return "Bus";
      case RouteType.Cable: return "Walk";
      case RouteType.Funicular: return "Metro";
      default: return "Transfer";
    }
  }

  public toRoute(routeId: number): Route {
    return {
      route_id: routeId,
      agency_id: null,
      route_short_name: `${this.modeDescription}:${this.origin}->${this.destination}`,
      route_long_name: `${this.modeDescription} from ${this.origin} to ${this.destination}`,
      route_type: this.mode,
      route_text_color: null,
      route_color: null,
      route_url: null,
      route_desc: this.modeDescription
    };
  }

  public toTrip(routeId: number, serviceId: string, tripId: number): Trip {
    return {
      route_id: routeId,
      service_id: serviceId,
      trip_id: tripId,
      trip_headsign: "",
      trip_short_name: "",
      direction_id: 0,
      block_id: "0",
      shape_id: "0",
      wheelchair_accessible: 0,
      bikes_allowed: 0
    };
  }

  public toFrequency(tripId: number): Frequency {
    return {
      trip_id: tripId,
      start_time: this.startTime,
      end_time: this.endTime,
      headway_secs: 1,
      exact_times: 0
    };
  }

  public toStops(tripId: number): [StopTime, StopTime] {
    return [
      {
        trip_id: tripId,
        arrival_time: null,
        departure_time: "00:00:00",
        stop_id: this.origin,
        stop_sequence: 1,
        stop_headsign: "",
        pickup_type: 0,
        drop_off_type: 1,
        shape_dist_traveled: null,
        timepoint: 0
      },
      {
        trip_id: tripId,
        arrival_time: formatDuration(this.duration),
        departure_time: null,
        stop_id: this.destination,
        stop_sequence: 2,
        stop_headsign: "",
        pickup_type: 1,
        drop_off_type: 0,
        shape_dist_traveled: null,
        timepoint: 0
      },
    ];
  }
}