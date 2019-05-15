import {GTFSZip} from "./loadGTFS";
import {GTFSFileStream} from "./GTFSFileStream";
import {Calendar, CalendarDate, ServiceID, Stop, StopTime, Transfer, Trip} from "./GTFS";
import {CalendarFactory} from "./calendar/CalendarFactory";

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
  private dummyCalendar = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
    start_date: "19700101",
    end_date: "20991231",
  };

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
  public merge(gtfs: GTFSZip): void {
    const serviceIdMap = {};

    this.writeStops(this.stopsStream, gtfs.stops);
    this.writeCalendars(gtfs.calendars, gtfs.calendarDates, serviceIdMap);
    this.writeTrips(gtfs.trips, gtfs.stopTimes, serviceIdMap);
    this.writeTransfers(this.transfersStream, gtfs.transfers);
    this.writeAll(this.routesStream, gtfs.routes);
    this.writeAll(this.agencyStream, gtfs.agencies);
  }

  private writeCalendars(calendars: Calendar[], dateIndex: Record<ServiceID, CalendarDate[]>, serviceIdMap: {}) {
    for (const calendar of calendars) {
      const calendarDates = dateIndex[calendar.service_id] || [];

      this.writeCalendar(calendar, calendarDates, serviceIdMap);
    }

    // check for any calendar dates that have no calendar entry
    for (const serviceId of Object.keys(dateIndex)) {
      if (!serviceIdMap[serviceId]) {
        const [calendar, calendarDates] = this.calendarFactory.create(serviceId, dateIndex[serviceId]);

        this.writeCalendar(calendar, calendarDates, serviceIdMap);
      }
    }
  }

  private writeCalendar(calendar: Calendar, calendarDates: CalendarDate[], serviceIdMap: {}) {
    const hash = getCalendarHash(calendar, calendarDates);

    if (!this.calendarHashes[hash]) {
      const serviceId = this.currentServiceId++;
      this.calendarHashes[hash] = serviceId;

      for (const calendarDay of calendarDates) {
        calendarDay.service_id = serviceId;
        this.calendarDatesStream.write(calendarDay);
      }

      serviceIdMap[calendar.service_id] = serviceId;
      calendar.service_id = serviceId;
      this.calendarStream.write(calendar);
    }
    else {
      serviceIdMap[calendar.service_id] = this.calendarHashes[hash];
    }
  }

  private writeTrips(trips: Trip[], stopTimes: StopTime[], serviceIdMap: Record<string, string>): void {
    const tripIdMap = {};

    for (const trip of trips) {
      tripIdMap[trip.trip_id] = this.currentTripId++;

      trip.trip_id = tripIdMap[trip.trip_id];
      trip.service_id = serviceIdMap[trip.service_id];

      this.tripsStream.write(trip);
    }

    for (const stopTime of stopTimes) {
      stopTime.trip_id = tripIdMap[stopTime.trip_id];
      stopTime.stop_id = this.parentStops[stopTime.stop_id] || stopTime.stop_id;

      this.stopTimesStream.write(stopTime);
    }
  }

  private writeAll(stream: GTFSFileStream, items: any[]): void {
    for (const item of items) {
      stream.write(item);
    }
  }

  private writeTransfers(stream: GTFSFileStream, transfers: Transfer[]): void {
    for (const transfer of transfers) {
      stream.write(transfer);

      this.additionalTransfers[transfer.from_stop_id + "," + transfer.to_stop_id] = true;
    }
  }

  private writeStops(stream: GTFSFileStream, stops: Stop[]): void {
    for (const stop of stops) {
      if (stop.parent_station) {
        this.parentStops[stop.stop_id] = stop.parent_station;
      }
      else {
        stream.write(stop);

        if (!this.stopLocations[stop.stop_id]) {
          this.addNearbyStops(stop);
        }
      }
    }
  }

  /**
   * Search any stops we've seen to see if we can walk there
   */
  private addNearbyStops(stop: Stop): void {
    const aLon = Number(stop.stop_lon);
    const aLat = Number(stop.stop_lat);

    for (const stopId in this.stopLocations) {
      const [bLon, bLat] = this.stopLocations[stopId];
      const key = stop.stop_id + "," + stopId;
      const reverseKey = stopId + "," + stop.stop_id;

      if (bLat === 0.0 && bLon === 0.0) {
        continue;
      }

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

}

function getCalendarHash(calendar: Calendar, calendarDates: CalendarDate[]): string {
  const { service_id, ...rest } = calendar;
  const days = calendarDates.map(d => d.date + "_" + d.exception_type).join(":");
  const fields = Object.values({ days, ...rest });

  return fields.join();
}
