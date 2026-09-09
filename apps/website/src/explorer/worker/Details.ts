import {addDays} from "@gb-transit/gtfs-loader";
import type {Row} from "@gb-transit/gtfs-loader";
import {feedWindow} from "../model/Calendar.js";
import type {Calendars} from "../model/Calendar.js";
import type {ColumnStore} from "../model/ColumnStore.js";
import {callsAtStop, callsOnTrip} from "../model/FeedIndex.js";
import type {FeedIndex} from "../model/FeedIndex.js";
import {NO_TIME} from "../model/CallStore.js";
import type {Links} from "../model/Links.js";
import type {Provenance} from "../provenance.js";
import {formatClock, formatTime, metresBetween} from "../format.js";
import type {
  BoardDetail, CallDetail, Departure, LinkDetail, RouteDetail, ServiceDetail, ShapeDetail, StopDetail,
  TripDetail
} from "./Detail.js";

/**
 * The joins the entity views need.
 *
 * They happen here, on the worker's side, because this is where the indexes are. Sending a page a
 * stop row and letting it look for the platforms underneath would mean sending it stops.txt too.
 *
 * How many trips a list shows before it stops. A route with nine thousand trips on it is not a list
 * anybody reads; the count is reported and the file table is where the rest of them live.
 */
const LIST_LIMIT = 200;

export interface Loaded {
  feed: FeedIndex;
  calendars: Calendars;
  links: Links;
  provenance?: Provenance;
}

export function stopDetail(loaded: Loaded, stopId: string): StopDetail {
  const {feed} = loaded;
  const stops = feed.files.get("stops.txt");
  const index = rowOf(stops, "stop_id", stopId);
  const row = index === undefined ? undefined : stops?.row(index);

  const children = (stops?.index("parent_station").get(stopId) ?? [])
    .map(child => ({row: stops!.row(child), index: child}))
    .map(child => ({
      ...child,
      // The enrichment-ordering artefact shows up here: a boarding point keeps the coordinate it had
      // before enrichment while its station gets NaPTAN's, so the two drift apart.
      metresFromParent: distance(row, child.row)
    }));

  const parentId = row?.parent_station;
  const parentIndex = parentId === undefined ? undefined : rowOf(stops, "stop_id", parentId);

  return {
    id: stopId,
    row,
    rowIndex: index,
    parent: parentIndex === undefined ? undefined : stops?.row(parentIndex),
    children,
    calls: feed.calls === undefined ? undefined : callsAtStop(feed, stopId).length,
    childCalls: feed.calls === undefined
      ? undefined
      : children.reduce((total, child) =>
        total + callsAtStop(feed, child.row.stop_id as string).length, 0),
    transfers: naming(feed.files.get("transfers.txt"), ["from_stop_id", "to_stop_id"], stopId),
    links: naming(feed.files.get("links.txt"), ["from_stop_id", "to_stop_id"], stopId),
    provenance: loaded.provenance?.of(stopId) ?? []
  };
}

export function tripDetail(loaded: Loaded, tripId: string): TripDetail {
  const {feed, calendars, links} = loaded;
  const trips = feed.files.get("trips.txt");
  const index = rowOf(trips, "trip_id", tripId);
  const row = index === undefined ? undefined : trips?.row(index);

  const routeId = row?.route_id;
  const routes = feed.files.get("routes.txt");
  const routeIndex = routeId === undefined ? undefined : rowOf(routes, "route_id", routeId);
  const route = routeIndex === undefined ? undefined : routes?.row(routeIndex);

  const agencies = feed.files.get("agency.txt");
  const agencyIndex = route?.agency_id === undefined
    ? undefined
    : rowOf(agencies, "agency_id", route.agency_id);

  const serviceId = row?.service_id;
  const calendar = feed.files.get("calendar.txt");
  const calendarIndex = serviceId === undefined
    ? undefined
    : rowOf(calendar, "service_id", serviceId);

  const window = feedWindow(feed);
  const dates = serviceId !== undefined && window !== undefined
    ? calendars.dates(serviceId, window.from, window.to)
    : [];

  return {
    id: tripId,
    row,
    rowIndex: index,
    route,
    agency: agencyIndex === undefined ? undefined : agencies?.row(agencyIndex),
    calls: callDetails(feed, tripId),
    calendar: calendarIndex === undefined ? undefined : calendar?.row(calendarIndex),
    dates,
    runs: dates.length === 0 ? undefined : dates.filter(date => date.runs).length,
    onward: links.onwardOf(tripId).map(link => linkDetail(feed, link.toTripId, link.toStopId, link.row)),
    prior: links.priorTo(tripId).map(link => linkDetail(feed, link.fromTripId, link.fromStopId, link.row)),
    shape: shapeDetail(feed, row?.shape_id)
  };
}

/**
 * The line a trip runs over.
 *
 * Sorted by shape_pt_sequence rather than taken in file order, because GTFS does not require
 * shapes.txt to be sorted and a caller drawing an unsorted one gets a scribble.
 *
 * A point whose coordinate does not parse is dropped rather than the shape abandoned: one bad row
 * in a feed somebody else built should cost that point and not the picture.
 */
function shapeDetail(feed: FeedIndex, shapeId: string | undefined): ShapeDetail | undefined {
  const shapes = feed.files.get("shapes.txt");

  if (shapeId === undefined || shapeId === "" || shapes === undefined) {
    return undefined;
  }

  const rows = shapes.index("shape_id").get(shapeId);

  if (rows === undefined || rows.length === 0) {
    return undefined;
  }

  const points = rows
    .map(row => ({
      sequence: Number(shapes.value("shape_pt_sequence", row)),
      lat: Number(shapes.value("shape_pt_lat", row)),
      lon: Number(shapes.value("shape_pt_lon", row))
    }))
    .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon))
    .sort((a, b) => a.sequence - b.sequence)
    .map(point => [point.lat, point.lon] as const);

  const trips = feed.files.get("trips.txt")?.index("shape_id").get(shapeId)?.length ?? 0;

  return {
    id: shapeId,
    points,
    trips,
    length: lengthOf(points),
    undrawable: points.length < 2 ? true : undefined
  };
}

/**
 * How far it is along the line, in kilometres.
 *
 * Equirectangular rather than haversine. Over the few kilometres between one point and the next the
 * two agree to well under the accuracy of the line itself, which is a straight hop between stations
 * across ground the rails curve over.
 */
function lengthOf(points: readonly (readonly [number, number])[]): number {
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const [lat, lon] = points[i];
    const [previousLat, previousLon] = points[i - 1];
    const x = (lon - previousLon) * Math.cos((lat + previousLat) / 2 * Math.PI / 180);

    total += Math.hypot(x, lat - previousLat) * 111.32;
  }

  return total;
}

export function routeDetail(loaded: Loaded, routeId: string): RouteDetail {
  const {feed} = loaded;
  const routes = feed.files.get("routes.txt");
  const index = rowOf(routes, "route_id", routeId);
  const trips = feed.files.get("trips.txt");
  const rows = trips?.index("route_id").get(routeId) ?? [];
  const row = index === undefined ? undefined : routes?.row(index);

  const agencies = feed.files.get("agency.txt");
  const agencyIndex = row?.agency_id === undefined
    ? undefined
    : rowOf(agencies, "agency_id", row.agency_id);

  return {
    id: routeId,
    row,
    agency: agencyIndex === undefined ? undefined : agencies?.row(agencyIndex),
    trips: rows.slice(0, LIST_LIMIT).map(trip => ({
      id: trips!.value("trip_id", trip) as string,
      headsign: trips!.value("trip_headsign", trip),
      shortName: trips!.value("trip_short_name", trip),
      serviceId: trips!.value("service_id", trip)
    })),
    totalTrips: rows.length
  };
}

export function serviceDetail(loaded: Loaded, serviceId: string): ServiceDetail {
  const {feed, calendars} = loaded;
  const calendar = feed.files.get("calendar.txt");
  const index = rowOf(calendar, "service_id", serviceId);
  const exceptions = feed.files.get("calendar_dates.txt");
  const trips = feed.files.get("trips.txt");
  const rows = trips?.index("service_id").get(serviceId) ?? [];
  const window = feedWindow(feed);

  return {
    id: serviceId,
    row: index === undefined ? undefined : calendar?.row(index),
    exceptions: (exceptions?.index("service_id").get(serviceId) ?? [])
      .map(row => exceptions!.row(row)),
    dates: window === undefined ? [] : calendars.dates(serviceId, window.from, window.to),
    trips: rows.slice(0, LIST_LIMIT).map(trip => ({
      id: trips!.value("trip_id", trip) as string,
      headsign: trips!.value("trip_headsign", trip),
      routeId: trips!.value("route_id", trip)
    })),
    totalTrips: rows.length
  };
}

/**
 * What departs a station on a date.
 *
 * The best end-to-end check there is: if the board for a station on a Tuesday looks like the trains
 * that actually run, the feed is broadly right, and if it does not the reason is one link away.
 *
 * Calls at the station's boarding points count as calls at the station, because in a GB feed every
 * call is at a boarding point and nothing calls at the parent. A board that only looked at the stop
 * it was given would be empty for every station in the country.
 */
export function boardAt(loaded: Loaded, stopId: string, date: number): BoardDetail {
  const {feed, calendars} = loaded;
  const stops = feed.files.get("stops.txt");
  const index = rowOf(stops, "stop_id", stopId);
  const trips = feed.files.get("trips.txt");

  if (feed.calls === undefined || trips === undefined) {
    return {
      stopId,
      stopName: index === undefined ? undefined : stops?.value("stop_name", index),
      date,
      departures: []
    };
  }

  const platforms = new Map<string, string | undefined>();

  for (const child of stops?.index("parent_station").get(stopId) ?? []) {
    platforms.set(stops!.value("stop_id", child) as string, stops!.value("platform_code", child));
  }
  if (platforms.size === 0) {
    platforms.set(stopId, index === undefined ? undefined : stops?.value("platform_code", index));
  }

  const calls = feed.calls;
  const departures: Departure[] = [];
  const previous = addDays(date, -1);

  for (const [platformId, platform] of platforms) {
    for (const row of callsAtStop(feed, platformId)) {
      const seconds = calls.departure[row] === NO_TIME ? calls.arrival[row] : calls.departure[row];

      if (seconds === NO_TIME) {
        continue;
      }

      const tripId = calls.tripId(row);
      const tripIndex = tripId === undefined ? undefined : rowOf(trips, "trip_id", tripId);
      const serviceId = tripIndex === undefined ? undefined : trips.value("service_id", tripIndex);

      if (tripId === undefined || serviceId === undefined) {
        continue;
      }

      // A train departing at 24:35 belongs to the previous day's service and appears on this
      // morning's board. Asking both days is what puts it where a passenger would look for it.
      const onToday = seconds < 86400 && calendars.runsOn(serviceId, date);
      const onPrevious = seconds >= 86400 && calendars.runsOn(serviceId, previous);

      if (!onToday && !onPrevious) {
        continue;
      }

      departures.push({
        tripId,
        seconds,
        time: formatClock(seconds),
        platform,
        headsign: tripIndex === undefined ? undefined : trips.value("trip_headsign", tripIndex),
        shortName: tripIndex === undefined ? undefined : trips.value("trip_short_name", tripIndex),
        destination: destinationOf(feed, tripId),
        pickup: calls.pickupType(row),
        ...(onPrevious ? {previousDay: true} : {})
      });
    }
  }

  // By the clock a passenger reads, so 24:35 sorts to the top of the morning rather than the bottom
  // of the night.
  departures.sort((a, b) => (a.seconds % 86400) - (b.seconds % 86400) || a.tripId.localeCompare(b.tripId));

  return {
    stopId,
    stopName: index === undefined ? undefined : stops?.value("stop_name", index),
    date,
    departures
  };
}

function callDetails(feed: FeedIndex, tripId: string): CallDetail[] {
  const calls = feed.calls;

  if (calls === undefined) {
    return [];
  }

  const stops = feed.files.get("stops.txt");

  return [...callsOnTrip(feed, tripId)].map(row => {
    const stopId = calls.stopId(row);
    const index = stopId === undefined ? undefined : rowOf(stops, "stop_id", stopId);

    return {
      row,
      stopId,
      stopName: index === undefined ? undefined : stops?.value("stop_name", index),
      parentId: index === undefined ? undefined : stops?.value("parent_station", index),
      platform: index === undefined ? undefined : stops?.value("platform_code", index),
      sequence: calls.sequence[row],
      arrival: calls.arrival[row] === NO_TIME ? undefined : formatTime(calls.arrival[row]),
      departure: calls.departure[row] === NO_TIME ? undefined : formatTime(calls.departure[row]),
      pickup: calls.pickupType(row),
      dropOff: calls.dropOffType(row),
      timepoint: calls.timepoint(row)
    };
  });
}

/**
 * Where a trip ends up, which is what a board calls the train.
 *
 * The station, not the platform. Every call in this feed is at a boarding point, so the last one
 * names something like "London Victoria Platform 11" - and no departure board in the country has
 * ever told a passenger which platform their train will arrive on at the other end.
 */
function destinationOf(feed: FeedIndex, tripId: string): string | undefined {
  const calls = callsOnTrip(feed, tripId);
  const last = calls[calls.length - 1];

  if (last === undefined || feed.calls === undefined) {
    return undefined;
  }

  const stopId = feed.calls.stopId(last);
  const stops = feed.files.get("stops.txt");
  const index = stopId === undefined ? undefined : rowOf(stops, "stop_id", stopId);

  if (index === undefined) {
    return stopId;
  }

  const parentId = stops?.value("parent_station", index);
  const parent = parentId === undefined || parentId === ""
    ? undefined
    : rowOf(stops, "stop_id", parentId);

  return parent === undefined
    ? stops?.value("stop_name", index)
    : stops?.value("stop_name", parent);
}

function linkDetail(
  feed: FeedIndex, tripId: string, stopId: string | undefined, row: number
): LinkDetail {
  const trips = feed.files.get("trips.txt");
  const tripIndex = rowOf(trips, "trip_id", tripId);
  const stops = feed.files.get("stops.txt");
  const stopIndex = stopId === undefined ? undefined : rowOf(stops, "stop_id", stopId);

  return {
    tripId,
    stopId,
    stopName: stopIndex === undefined ? undefined : stops?.value("stop_name", stopIndex),
    headsign: tripIndex === undefined ? undefined : trips?.value("trip_headsign", tripIndex),
    row
  };
}

/**
 * The row of a store whose column holds a value.
 *
 * The index is built on first use and kept by the store, so the second lookup on a file costs
 * nothing. Building one per call over 278,794 trips is the shape of mistake that makes a page feel
 * broken, so the memo matters.
 */
const indexes = new WeakMap<ColumnStore, Map<string, Map<string, number>>>();

function rowOf(store: ColumnStore | undefined, column: string, value: string): number | undefined {
  if (store === undefined) {
    return undefined;
  }

  const byColumn = indexes.get(store) ?? new Map<string, Map<string, number>>();

  indexes.set(store, byColumn);

  let index = byColumn.get(column);

  if (index === undefined) {
    index = new Map<string, number>();

    for (let row = 0; row < store.rows; row++) {
      const key = store.value(column, row);

      // First wins, so the row a duplicate id resolves to is the same every time it is asked for.
      if (key !== undefined && !index.has(key)) {
        index.set(key, row);
      }
    }

    byColumn.set(column, index);
  }

  return index.get(value);
}

/** Rows of a file naming a stop in any of the given columns. */
function naming(store: ColumnStore | undefined, columns: string[], id: string): Row[] {
  if (store === undefined) {
    return [];
  }

  const rows = new Set<number>();

  for (const column of columns) {
    for (const row of store.index(column).get(id) ?? []) {
      rows.add(row);
    }
  }

  return [...rows].sort((a, b) => a - b).map(row => store.row(row));
}

function distance(parent: Row | undefined, child: Row): number | undefined {
  const from = coordinate(parent);
  const to = coordinate(child);

  return from === undefined || to === undefined
    ? undefined
    : metresBetween(from.lat, from.lon, to.lat, to.lon);
}

function coordinate(row: Row | undefined): {lat: number, lon: number} | undefined {
  const lat = Number(row?.stop_lat);
  const lon = Number(row?.stop_lon);

  return Number.isFinite(lat) && Number.isFinite(lon) && row?.stop_lat !== undefined
    ? {lat, lon}
    : undefined;
}
