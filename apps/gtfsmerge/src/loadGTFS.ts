import * as gtfs from "gtfs-stream";
import * as fs from "fs";
import {Agency, Calendar, CalendarDate, Route, ServiceID, Stop, StopTime, Transfer, Trip} from "./GTFS";

/**
 * Returns trips, transfers, interchange time and calendars from a GTFS zip.
 */
export function loadGTFS(filename: string): Promise<GTFSZip> {
  const result: GTFSZip = {
    trips: [],
    transfers: [],
    calendars: [],
    calendarDates: {},
    stopTimes: [],
    routes: [],
    agencies: [],
    stops: [],
  };

  const processor = {
    trip: row => result.trips.push(row),
    stop_time: row => result.stopTimes.push(row),
    transfer: row => result.transfers.push(row),
    route: row => result.routes.push(row),
    stop: row => result.stops.push(row),
    agency: row => result.agencies.push(row),
    calendar: row => result.calendars.push(row),
    calendar_date: row => {
      result.calendarDates[row.service_id] = result.calendarDates[row.service_id] || [];

      result.calendarDates[row.service_id].push(row);
    },
    link: row => {
      row.min_transfer_time = row.duration;
      row.transfer_type = 2;

      result.transfers.push(row);
    },
  };

  return new Promise(resolve => {
    fs.createReadStream(filename)
    .pipe(gtfs())
    .on("data", entity => processor[entity.type](clean(entity.data)))
    .on("end", () => resolve(result));
  });

}

// See https://github.com/staeco/gtfs-stream/issues/2
function clean(obj: {}): {} {
  return Object
    .entries(obj)
    .reduce((acc, [key, val]) => Object.assign(acc, { [removeBom(key)]: val }), {});
}

function removeBom(key: string): string {
  return key.charCodeAt(0) === 0xFEFF ? key.slice(1) : key;
}

export interface GTFSZip {
  trips: Trip[],
  transfers: Transfer[],
  calendars: Calendar[],
  calendarDates: Record<ServiceID, CalendarDate[]>,
  stopTimes: StopTime[],
  routes: Route[],
  agencies: Agency[],
  stops: Stop[],
}
