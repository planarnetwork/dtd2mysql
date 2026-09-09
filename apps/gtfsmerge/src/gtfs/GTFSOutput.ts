import {AgencyRow, AttributionRow} from "@gb-transit/gtfs-schema";
import {GTFSZip} from "./FeedIndex";
import {CalendarMerger} from "./merger/CalendarMerger";
import {StopsAndTransfersMerger} from "./merger/StopsAndTransfersMerger";
import {StopTimeReader, StopTimesMerger} from "./merger/StopTimesMerger";
import {TripsMerger} from "./merger/TripsMerger";
import {GenericMerger} from "./merger/GenericMerger";
import {AreasMerger} from "./merger/AreasMerger";
import {FeedInfoMerger} from "./merger/FeedInfoMerger";
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
    private readonly agencies: GenericMerger<AgencyRow>,
    private readonly routes: RouteMerger,
    private readonly attributions: GenericMerger<AttributionRow>,
    private readonly areas: AreasMerger,
    private readonly feedInfo: FeedInfoMerger
  ) {}

  /**
   * Merge in the given GTFS data set and push the new items to the file streams.
   *
   * The order is what the re-indexing needs: routes and calendars give the maps
   * the trips are indexed against, the trips give the map the stop times and the
   * couplings are indexed against, and the stop times say which stops anything
   * actually calls at.
   *
   * The stop times arrive as a reader rather than as rows, because that order is
   * also the reason they need not be held: nothing can be done with a call until
   * its trip has been numbered, and nothing needs it afterwards.
   */
  public async write(gtfs: GTFSZip, stopTimes: StopTimeReader): Promise<void> {
    const [routeIdMap, serviceIdMap] = await Promise.all([
      this.routes.write(gtfs.routes),
      this.calendar.write(gtfs.calendars, gtfs.calendarDates)
    ]);

    const tripIdMap = await this.trips.write(gtfs.trips, serviceIdMap, routeIdMap);
    const usedStops = await this.stopTimes.write(stopTimes, tripIdMap, gtfs.parentStops);

    this.feedInfo.write(gtfs.feedInfo);

    await Promise.all([
      this.stopsAndTransfers.write(
        gtfs.stops, gtfs.transfers, gtfs.parentStops, usedStops, tripIdMap
      ),
      this.agencies.write(gtfs.agencies),
      this.attributions.write(gtfs.attributions),
      this.areas.write(gtfs.areas, gtfs.stopAreas, gtfs.parentStops, usedStops)
    ]);
  }

  public async end(): Promise<void> {
    await Promise.all([
      this.calendar.end(),
      this.stopsAndTransfers.end(),
      this.stopTimes.end(),
      this.trips.end(),
      this.agencies.end(),
      this.routes.end(),
      this.attributions.end(),
      this.areas.end(),
      this.feedInfo.end()
    ]);
  }
}
