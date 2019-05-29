import { GTFSZip } from "./GTFSLoader";
import { CalendarMerger } from "./merger/CalendarMerger";
import { StopsAndTransfersMerger } from "./merger/StopsAndTransfersMerger";
import { StopTimesMerger } from "./merger/StopTimesMerger";
import { TripIDMap, TripsMerger } from "./merger/TripsMerger";
import { GenericMerger } from "./merger/GenericMerger";

/**
 * Merges multiple GTFS sets into a single stream for each GTFS file (stops.txt etc)
 */
export class GTFSOutput {

  constructor(
    private readonly calendar: CalendarMerger,
    private readonly stopsAndTransfers: StopsAndTransfersMerger,
    private readonly stopTimes: StopTimesMerger,
    private readonly trips: TripsMerger,
    private readonly agencies: GenericMerger,
    private readonly routes: GenericMerger
  ) {}

  /**
   * Merge in the given GTFS data set and push the new items to the file streams.
   */
  public async write(gtfs: GTFSZip): Promise<void> {
    const [parentStops, tripIdMap] = await Promise.all([
      this.stopsAndTransfers.write(gtfs.stops, gtfs.transfers),
      this.writeCalendarsAndTrips(gtfs),
      this.agencies.write(gtfs.agencies),
      this.routes.write(gtfs.routes)
    ]);

    await this.stopTimes.write(gtfs.stopTimes, tripIdMap, parentStops);
  }

  private async writeCalendarsAndTrips(gtfs: GTFSZip): Promise<TripIDMap> {
    const serviceIdMap = await this.calendar.write(gtfs.calendars, gtfs.calendarDates);

    return this.trips.write(gtfs.trips, serviceIdMap);
  }

  public async end(): Promise<void> {
    await Promise.all([
      this.calendar.end(),
      this.stopsAndTransfers.end(),
      this.stopTimes.end(),
      this.trips.end(),
      this.agencies.end(),
      this.routes.end()
    ]);
  }
}

