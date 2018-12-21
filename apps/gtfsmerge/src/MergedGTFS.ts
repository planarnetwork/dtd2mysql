import {GTFSZip} from "./loadGTFS";
import {GTFSFileStream} from "./GTFSFileStream";
import {Calendar, CalendarDate, ServiceID, StopTime, Trip} from "./GTFS";

/**
 * Merges multiple GTFS sets into a single stream for each GTFS file (stops.txt etc)
 */
export class MergedGTFS {
  private calendarHashes = {};
  private currentServiceId = 1;
  private currentTripId = 1;

  constructor(
    private readonly calendarStream: GTFSFileStream,
    private readonly calendarDatesStream: GTFSFileStream,
    private readonly tripsStream: GTFSFileStream,
    private readonly stopTimesStream: GTFSFileStream,
    private readonly routesStream: GTFSFileStream,
    private readonly agencyStream: GTFSFileStream,
    private readonly stopsStream: GTFSFileStream,
    private readonly transfersStream: GTFSFileStream
  ) {}

  /**
   * Merge in the given GTFS data set and push the new items to the file streams.
   */
  public merge(gtfs: GTFSZip): void {
    const serviceIdMap = {};

    this.writeCalendars(gtfs.calendars, gtfs.calendarDates, serviceIdMap);
    this.writeTrips(gtfs.trips, gtfs.stopTimes, serviceIdMap);
    this.writeAll(this.routesStream, gtfs.routes);
    this.writeAll(this.agencyStream, gtfs.agencies);
    this.writeAll(this.stopsStream, gtfs.stops);
    this.writeAll(this.transfersStream, gtfs.transfers);
  }

  private writeCalendars(calendars: Calendar[], dateIndex: Record<ServiceID, CalendarDate[]>, serviceIdMap: {}) {
    for (const calendar of calendars) {
      const calendarDates = dateIndex[calendar.service_id] || [];
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

      this.stopTimesStream.write(stopTime);
    }
  }

  private writeAll(stream: GTFSFileStream, items: any[]): void {
    for (const item of items) {
      stream.write(item);
    }
  }
}

function getCalendarHash(calendar: Calendar, calendarDates: CalendarDate[]): string {
  const { service_id, ...rest } = calendar;
  const days = calendarDates.map(d => d.date + "_" + d.exception_type).join(":");
  const fields = Object.values({ days, ...rest });

  return fields.join();
}
