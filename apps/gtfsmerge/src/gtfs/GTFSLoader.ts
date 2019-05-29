import { Agency, Calendar, CalendarDate, Route, ServiceID, Stop, StopTime, Transfer, Trip } from "./GTFS";
import { Readable, Transform } from "stream";

/**
 * Returns trips, transfers, interchange time and calendars from a GTFS zip.
 */
export class GTFSLoader {

  constructor(
    private readonly gtfsStream: Transform
  ) {}

  /**
   * Create a mutable loader then add each row until the end of the stream is reached
   */
  public load(file: Readable, stopPrefix: string = "", filterBefore?: string): Promise<GTFSZip> {
    return new Promise(resolve => {
      const handler = new MutableGTFSLoader(stopPrefix, filterBefore);

      file.pipe(this.gtfsStream)
        .on("data", entity => handler.process(entity))
        .on("end", () => resolve(handler.getResults()));
    });
  }

}

/**
 * Encapsulation of mutable state while the results are loaded from the zip
 */
class MutableGTFSLoader {
  private readonly transfers = {};
  private readonly result: GTFSZip = {
    trips: [],
    transfers: [],
    calendars: [],
    calendarDates: {},
    stopTimes: [],
    routes: [],
    agencies: [],
    stops: [],
  };

  constructor(
    private readonly stopPrefix: string = "",
    private readonly filterBefore: string | undefined
  ) { }

  public process(entity: any) {
    return this[entity.type] && this[entity.type](entity.data);
  }

  /**
   * Flatten the transfers and return the results
   */
  public getResults(): GTFSZip {
    return {
      ...this.result,
      transfers: Object.values(this.transfers)
    };
  }

  private trip(row: Trip): void {
    this.result.trips.push(row);
  }

  private stop_time(row: StopTime): void {
    if (row.departure_time && row.arrival_time) {
      row.stop_id = this.stopPrefix + row.stop_id;
      this.result.stopTimes.push(row);
    }
  }

  private route(row: Route): void {
    this.result.routes.push(row);
  }

  private stop(row: Stop): void {
    row.stop_id = this.stopPrefix + row.stop_id;
    row.stop_lon = +row.stop_lon;
    row.stop_lat = +row.stop_lat;

    this.result.stops.push(row);
  }

  private agency(row: Agency): void {
    this.result.agencies.push(row);
  }

  private calendar(row: Calendar): void {
    const inPast = !this.filterBefore || row.end_date < this.filterBefore;
    const runs = row.monday
      || row.tuesday
      || row.wednesday
      || row.thursday
      || row.friday
      || row.saturday
      || row.sunday;

    if (!inPast && runs) {
      this.result.calendars.push(row);
    }
  }

  private calendar_date(row: CalendarDate) {
    if (!this.filterBefore || row.date >= this.filterBefore) {
      this.result.calendarDates[row.service_id] = this.result.calendarDates[row.service_id] || [];

      this.result.calendarDates[row.service_id].push(row);
    }
  }

  private link(row: any): void {
    row.min_transfer_time = row.duration;
    row.transfer_type = 2;

    this.transfer(row);
  }

  private transfer(row: Transfer) {
    row.from_stop_id = this.stopPrefix + row.from_stop_id;
    row.to_stop_id = this.stopPrefix + row.to_stop_id;

    const key = row.from_stop_id + "_" + row.to_stop_id;

    if (!this.transfers[key] || this.transfers[key].min_transfer_time > row.min_transfer_time) {
      this.transfers[key] = row;
    }
  }
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
