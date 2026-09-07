import {GTFSZip} from "./FeedIndex";
import {CalendarMerger} from "./merger/CalendarMerger";
import {StopsAndTransfersMerger} from "./merger/StopsAndTransfersMerger";
import {StopTimesMerger} from "./merger/StopTimesMerger";
import {TripsMerger} from "./merger/TripsMerger";
import {GenericMerger} from "./merger/GenericMerger";
import {RouteMerger} from "./merger/RouteMerger";

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
    private readonly routes: RouteMerger
  ) {}

  /**
   * Merge in the given GTFS data set and push the new items to the file streams.
   *
   * The order is what the re-indexing needs: routes and calendars give the maps
   * the trips are indexed against, the trips give the map the stop times and the
   * couplings are indexed against, and the stop times say which stops anything
   * actually calls at.
   */
  public async write(gtfs: GTFSZip): Promise<void> {
    const [routeIdMap, serviceIdMap] = await Promise.all([
      this.routes.write(gtfs.routes),
      this.calendar.write(gtfs.calendars, gtfs.calendarDates)
    ]);

    const tripIdMap = await this.trips.write(gtfs.trips, serviceIdMap, routeIdMap);
    const usedStops = await this.stopTimes.write(gtfs.stopTimes, tripIdMap, gtfs.parentStops);

    await Promise.all([
      this.stopsAndTransfers.write(
        gtfs.stops, gtfs.transfers, gtfs.parentStops, usedStops, tripIdMap
      ),
      this.agencies.write(gtfs.agencies)
    ]);
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
