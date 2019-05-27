import * as gtfs from "gtfs-stream";
import * as fs from "fs";
import {Agency, Calendar, CalendarDate, Route, ServiceID, Stop, StopTime, Transfer, Trip} from "../GTFS";
import {toGTFSDate} from "../../date/toGTFSDate";

/**
 * Returns trips, transfers, interchange time and calendars from a GTFS zip.
 */
export function loadGTFS(filename: string, stopPrefix: string = ""): Promise<GTFSZip> {
  const today = toGTFSDate(new Date());
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
      if (row.departure_time && row.arrival_time) {
        row.stop_id = stopPrefix + row.stop_id;
        result.stopTimes.push(row);
      }
    },
    transfer: addTransfer,
    route: row => result.routes.push(row),
    stop: row => {
      row.stop_id = stopPrefix + row.stop_id;
      row.stop_lon = +row.stop_lon;
      row.stop_lat = +row.stop_lat;

      result.stops.push(row);
    },
    agency: row => result.agencies.push(row),
    calendar: row => {
      const inPast = row.end_date < today;
      const runs = row.monday || row.tuesday || row.wednesday || row.thursday || row.friday || row.saturday || row.sunday;

      if (!inPast && runs) {
        result.calendars.push(row);
      }
    },
    calendar_date: row => {
      if (row.date >= today) {
        result.calendarDates[row.service_id] = result.calendarDates[row.service_id] || [];

        result.calendarDates[row.service_id].push(row);
      }
    },
    link: row => {
      row.min_transfer_time = row.duration;
      row.transfer_type = 2;

      addTransfer(row);
    },
  };

  function addTransfer(row: Transfer) {
    row.from_stop_id = stopPrefix + row.from_stop_id;
    row.to_stop_id = stopPrefix + row.to_stop_id;

    const key = row.from_stop_id + "_" + row.to_stop_id;

    if (!transfers[key] || transfers[key].min_transfer_time > row.min_transfer_time) {
      transfers[key] = row;
    }
  }

  return new Promise(resolve => {
    fs.createReadStream(filename)
      .pipe(gtfs({ raw: true }))
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
