import {GTFSZip} from "./input/GTFSLoader";
import {GTFSFileStream} from "./output/GTFSFileStream";
import {Calendar, CalendarDate, ServiceID, Stop, StopTime, Transfer, Trip} from "./GTFS";
import {CalendarFactory} from "../calendar/CalendarFactory";

/**
 * Merges multiple GTFS sets into a single stream for each GTFS file (stops.txt etc)
 */
export class MergedGTFS {
  private calendarHashes = {};
  private currentServiceId = 1;
  private currentTripId = 1;
  private stopLocations = {};
  private parentStops = {};
  private additionalTransfers = {};

  constructor(
    private readonly calendarStream: GTFSFileStream,
    private readonly calendarDatesStream: GTFSFileStream,
    private readonly tripsStream: GTFSFileStream,
    private readonly stopTimesStream: GTFSFileStream,
    private readonly routesStream: GTFSFileStream,
    private readonly agencyStream: GTFSFileStream,
    private readonly stopsStream: GTFSFileStream,
    private readonly transfersStream: GTFSFileStream,
    private readonly transferDistance: number,
    private readonly calendarFactory: CalendarFactory
  ) {}

  /**
   * Merge in the given GTFS data set and push the new items to the file streams.
   */
  public async merge(gtfs: GTFSZip): Promise<void> {
    const serviceIdMap = {};

    await this.writeStops(this.stopsStream, gtfs.stops);
    await this.writeCalendars(gtfs.calendars, gtfs.calendarDates, serviceIdMap);
    await this.writeTrips(gtfs.trips, gtfs.stopTimes, serviceIdMap);
    await this.writeTransfers(gtfs.transfers);
    await this.writeAll(this.routesStream, gtfs.routes);
    await this.writeAll(this.agencyStream, gtfs.agencies);
  }

  private async writeCalendars(calendars: Calendar[], dateIndex: Record<ServiceID, CalendarDate[]>, serviceIdMap: {}): Promise<void> {
    for (const calendar of calendars) {
      const calendarDates = dateIndex[calendar.service_id] || [];

      await this.writeCalendar(calendar, calendarDates, serviceIdMap);
    }

    // check for any calendar dates that have no calendar entry
    for (const serviceId of Object.keys(dateIndex)) {
      if (!serviceIdMap[serviceId]) {
        const [calendar, calendarDates] = this.calendarFactory.create(serviceId, dateIndex[serviceId]);

        await this.writeCalendar(calendar, calendarDates, serviceIdMap);
      }
    }
  }

  private async writeCalendar(calendar: Calendar, calendarDates: CalendarDate[], serviceIdMap: {}): Promise<void> {
    const hash = getCalendarHash(calendar, calendarDates);

    if (!this.calendarHashes[hash]) {
      const serviceId = this.currentServiceId++;
      this.calendarHashes[hash] = serviceId;

      for (const calendarDay of calendarDates) {
        calendarDay.service_id = serviceId;
        await this.write(this.calendarDatesStream, calendarDay);
      }

      serviceIdMap[calendar.service_id] = serviceId;
      calendar.service_id = serviceId;
      await this.write(this.calendarStream, calendar);
    }
    else {
      serviceIdMap[calendar.service_id] = this.calendarHashes[hash];
    }
  }

  private async writeTrips(trips: Trip[], stopTimes: StopTime[], serviceIdMap: Record<string, string>): Promise<void> {
    const tripIdMap = {};

    for (const trip of trips) {
      if (serviceIdMap[trip.service_id]) {
        tripIdMap[trip.trip_id] = this.currentTripId++;

        trip.trip_id = tripIdMap[trip.trip_id];
        trip.service_id = serviceIdMap[trip.service_id];

        await this.write(this.tripsStream, trip);
      }
    }

    for (const stopTime of stopTimes) {
      if (tripIdMap[stopTime.trip_id]) {
        stopTime.trip_id = tripIdMap[stopTime.trip_id];
        stopTime.stop_id = this.parentStops[stopTime.stop_id] || stopTime.stop_id;

        await this.write(this.stopTimesStream, stopTime);
      }
    }
  }

  private async writeAll(stream: GTFSFileStream, items: any[]): Promise<void> {
    for (const item of items) {
      await this.write(stream, item);
    }
  }

  private async writeTransfers(transfers: Transfer[]): Promise<void> {
    for (const transfer of transfers) {
      await this.write(this.transfersStream, transfer);

      this.additionalTransfers[transfer.from_stop_id + "," + transfer.to_stop_id] = true;
    }
  }

  private async writeStops(stream: GTFSFileStream, stops: Stop[]): Promise<void> {
    for (const stop of stops) {
      if (stop.parent_station) {
        this.parentStops[stop.stop_id] = stop.parent_station;
      }
      else {
        await this.write(stream, stop);

        if (stop.stop_lon !== 0 && stop.stop_lat !== 0) {
          this.addNearbyStops(stop);
        }
      }
    }
  }

  /**
   * Search any stops we've seen to see if we can walk there
   */
  private addNearbyStops(stop: Stop): void {
    const aLon = stop.stop_lon;
    const aLat = stop.stop_lat;

    for (const stopId in this.stopLocations) {
      const [bLon, bLat] = this.stopLocations[stopId];
      const key = stop.stop_id + "," + stopId;
      const reverseKey = stopId + "," + stop.stop_id;

      if (!this.additionalTransfers[key] || !this.additionalTransfers[reverseKey]) {
        const distance = this.getDistance(aLon, aLat, bLon, bLat);

        if (distance < this.transferDistance) {
          const t = Math.max(60, Math.round(distance * 72000));
          const transfer = { from_stop_id: stop.stop_id, to_stop_id: stopId, transfer_type: 2, min_transfer_time: t };
          const reverse = { from_stop_id: stopId, to_stop_id: stop.stop_id, transfer_type: 2, min_transfer_time: t };

          this.additionalTransfers[key] = this.additionalTransfers[key] || transfer;
          this.additionalTransfers[reverseKey] = this.additionalTransfers[reverseKey] || reverse;
        }
      }
    }

    this.stopLocations[stop.stop_id] = [aLon, aLat];
  }

  /**
   * Note this method of calculating distances between stations is flawed and only used as a rough guide.
   */
  private getDistance(aLon: number, aLat: number, bLon: number, bLat: number) {
    return Math.abs(bLat - aLat) + Math.abs(bLon - aLon);
  }

  public async end(): Promise<void> {

    for (const transfer of Object.values(this.additionalTransfers)) {
      if (transfer !== true) {
        this.transfersStream.write(transfer);
      }
    }

    await Promise.all([
      this.calendarDatesStream.end(),
      this.calendarStream.end(),
      this.tripsStream.end(),
      this.stopTimesStream.end(),
      this.routesStream.end(),
      this.agencyStream.end(),
      this.stopsStream.end(),
      this.transfersStream.end()
    ]);
  }

  private write(stream: GTFSFileStream, data: any): Promise<void> | void {
    const writable = stream.write(data);

    if (!writable) {
      return new Promise(resolve => stream.once("drain", () => resolve()));
    }
  }
}

function getCalendarHash(calendar: Calendar, calendarDates: CalendarDate[]): string {
  const { service_id, ...rest } = calendar;
  const days = calendarDates.map(d => d.date + "_" + d.exception_type).join(":");
  const fields = Object.values({ days, ...rest });

  return fields.join();
}
