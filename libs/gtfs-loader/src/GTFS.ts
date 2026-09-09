import type { ServiceCalendar } from "./Service.js";

// A duration is seconds and a day of week is Sunday-first, exactly as the feed build has them.
// Imported rather than declared again so that a feed read here and a feed written by
// @gb-transit/gtfs cannot come to disagree about either. Both are type only, so nothing of the
// schema package survives into the output.
import type { DayOfWeek, Duration } from "@gb-transit/gtfs-schema/scalars";

export type { DayOfWeek, Duration };

/**
 * StopID e.g. NRW
 */
export type StopID = string;

/**
 * Time in seconds since midnight (note this may be greater than 24 hours).
 */
export type Time = number;

/**
 * GTFS stop time
 */
export interface StopTime {
  /** The stop as the feed gives it, which may identify a platform within a station */
  stop: StopID;
  arrivalTime: Time;
  departureTime: Time;
  pickUp: boolean;
  dropOff: boolean;
}

/**
 * A walk between two stops, available between the given times.
 *
 * Declares its own origin and destination rather than extending the journey Leg it also satisfies,
 * so that the feed's own types do not depend on the shape results are returned in.
 */
export interface Transfer {
  origin: StopID;
  destination: StopID;
  duration: Duration;
  startTime: Time;
  endTime: Time;
  mode?: string;
}

/**
 * GTFS trip_id
 */
export type TripID = string;

/**
 * GTFS service_id, used to determine the trip's calendar
 */
export type ServiceID = string;

/**
 * GTFS trip
 */
export interface Trip {
  tripId: TripID;
  /** The trip's stopping pattern as the feed gives it, passing points and all */
  stopTimes: StopTime[];
  serviceId: ServiceID;
  service: ServiceCalendar;
  routeId?: RouteID;
  shortName?: string;
  headsign?: string;
  /** The line this trip runs over, into the feed's shapes. Absent where it names none. */
  shapeId?: ShapeID;
}

/**
 * A transfers.txt row of transfer_type 4, saying the vehicle of one trip carries on as another.
 *
 * The stops are optional in GTFS and identify platforms rather than the station the coupling
 * happens at, so they place the coupling within each trip rather than name where it is.
 */
export interface TripLink {
  fromTripId: TripID;
  toTripId: TripID;
  fromStop?: StopID;
  toStop?: StopID;
}

/**
 * Date stored as a number, e.g 20181225
 */
export type DateNumber = number;

/**
 * Index of dates, used to access exclude/include dates in O(1) time
 */
export type DateIndex = Record<DateNumber, boolean>;

/**
 * GTFS calendar
 */
export interface Calendar {
  serviceId: ServiceID;
  startDate: DateNumber;
  endDate: DateNumber;
  days: Record<DayOfWeek, boolean>;
  exclude: DateIndex;
  include: DateIndex;
}

/**
 * Calendars indexed by service ID
 */
export type CalendarIndex = Record<ServiceID, Calendar>;

/**
 * GTFS stop.
 *
 * Only the id and the position are required of a feed, and an empty field is read as undefined
 * rather than as the empty string - so everything a feed may leave out is typed as missing. Saying
 * otherwise would promise a caller a name it can call .toUpperCase() on, which is a runtime error
 * the compiler had told them could not happen.
 */
export interface Stop {
  id: StopID,
  /** stop_code, which is what a feed identifying platforms calls the station they belong to */
  code?: string,
  name?: string,
  description?: string,
  latitude: number,
  longitude: number,
  timezone?: string,
  locationType: number,
  parentStation?: StopID,
  platformCode?: string
}

/**
 * Stops indexed by ID
 */
export type StopIndex = Record<StopID, Stop>;

/**
 * GTFS route_id
 */
export type RouteID = string;

/**
 * GTFS agency_id
 */
export type AgencyID = string;

/**
 * GTFS area_id
 */
export type AreaID = string;

/**
 * GTFS route
 */
export interface Route {
  id: RouteID;
  agencyId?: AgencyID;
  shortName?: string;
  longName?: string;
  type: number;
  color?: string;
  textColor?: string;
  url?: string;
  description?: string;
}

/**
 * Routes indexed by ID
 */
export type RouteIndex = Record<RouteID, Route>;

/**
 * GTFS agency. The id is as the feed wrote it, which in a GB rail feed is the NOC form, `=AW`.
 */
export interface Agency {
  id: AgencyID;
  name?: string;
  url?: string;
  timezone?: string;
  lang?: string;
  phone?: string;
  fareUrl?: string;
}

/**
 * Agencies indexed by ID
 */
export type AgencyIndex = Record<AgencyID, Agency>;

/**
 * A flat, named set of stops - areas.txt and stop_areas.txt read as one thing.
 */
export interface Area {
  id: AreaID;
  name?: string;
  stops: StopID[];
}

/**
 * Areas indexed by ID
 */
export type AreaIndex = Record<AreaID, Area>;

/**
 * GTFS shape_id
 */
export type ShapeID = string;

/**
 * A point on the line a trip runs over.
 *
 * A pair rather than an object per point: a national feed is millions of these, and the two
 * numbers are the whole of what a caller drawing the line needs. `shape_dist_traveled` is not
 * read - see COLUMNS in EntityType.
 */
export interface ShapePoint {
  latitude: number;
  longitude: number;
}

/**
 * The lines the feed's trips run over, indexed by id and each in sequence order.
 *
 * Ordered here rather than left to the file, because GTFS does not require shapes.txt to be
 * sorted and a caller drawing an unsorted one gets a scribble.
 */
export type ShapeIndex = Record<ShapeID, ShapePoint[]>;

/**
 * Minimum time needed to change vehicles at each stop
 */
export type Interchange = Record<StopID, Time>;

/**
 * Footpaths out of each stop
 */
export type TransfersByOrigin = Record<StopID, Transfer[]>;
