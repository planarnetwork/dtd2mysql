import {
  CalendarRow, RouteRow, RouteType, RowWriter, StopRow, StopTimeRow, TripRow
} from "@gb-transit/gtfs-schema";

/**
 * Rows and writers for the merger specs.
 *
 * A merger takes a RowWriter and a list of rows, so every one of their specs
 * needs the same two things. Not a `.spec.ts` itself: it has no tests of its
 * own, and a file named for what it holds is easier to find than a helper
 * exported from whichever spec happened to define it first.
 */
export function collect<T>(): RowWriter<T> & {rows: T[]} {
  const rows: T[] = [];

  return {
    rows,
    write(row: T) { rows.push({...row as object} as T); return true; },
    drain: async () => {},
    end() {},
    finished: async () => {}
  };
}

export const route = (id: string, type: RouteType): RouteRow => ({
  route_id: id, agency_id: "a", route_short_name: id, route_long_name: null, route_type: type,
  route_text_color: null, route_color: null, route_url: null, route_desc: null
});

export const trip = (id: string, service: string | number, routeId: string): TripRow => ({
  route_id: routeId, service_id: service, trip_id: id, trip_headsign: "x", trip_short_name: "y",
  direction_id: 0, wheelchair_accessible: 0, bikes_allowed: 0
});

export const stopTime = (tripId: string, stopId: string, sequence: number): StopTimeRow => ({
  trip_id: tripId, arrival_time: "10:00:00", departure_time: "10:01:00", stop_id: stopId,
  stop_sequence: sequence, stop_headsign: null, pickup_type: 0, drop_off_type: 0,
  shape_dist_traveled: null, timepoint: 1
});

export const stop = (id: string, lat: number, lon: number): StopRow => ({
  stop_id: id, stop_code: id, stop_name: id, stop_desc: null, zone_id: null, stop_url: null,
  location_type: 0, parent_station: null, platform_code: null, stop_timezone: null,
  wheelchair_boarding: 0, stop_lon: lon, stop_lat: lat
});

export const calendar = (
  id: string | number, from: string, to: string, monday: 0 | 1 = 1
): CalendarRow => ({
  service_id: id, monday, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0,
  start_date: from, end_date: to
});
