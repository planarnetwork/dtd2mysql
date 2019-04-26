import * as gtfs from "gtfs-stream";
import * as fs from "fs";
import {Agency, Calendar, CalendarDate, Route, ServiceID, Stop, StopTime, Transfer, Trip} from "./GTFS";

/**
 * Returns trips, transfers, interchange time and calendars from a GTFS zip.
 */
export function loadGTFS(filename: string): Promise<GTFSZip> {
  const transfers = {};
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
    stop_time: row => {
      if (row.departure_time !== null && row.arrival_time !== null) {
        result.stopTimes.push(row);
      }
    },
    transfer: addTransfer,
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

      addTransfer(row);
    },
  };

  function addTransfer(row: Transfer) {
    const key = row.from_stop_id + "_" + row.to_stop_id;

    if (!transfers[key] || transfers[key].min_transfer_time > row.min_transfer_time) {
      transfers[key] = row;
    }
  }

  return new Promise(resolve => {
    fs.createReadStream(filename)
      .pipe(gtfs())
      .on("data", entity => processor[entity.type] && processor[entity.type](entity.data))
      .on("end", () => resolve({
        ...result,
        transfers: Object.values(transfers)
      }));
  });

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
