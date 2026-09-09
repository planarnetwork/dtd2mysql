import {AgencyRow, AttributionRow} from "@gb-transit/gtfs-schema";
import {FeedStream, GTFSZip} from "./FeedIndex";
import {CalendarMerger} from "./merger/CalendarMerger";
import {StopsAndTransfersMerger} from "./merger/StopsAndTransfersMerger";
import {StopTimesMerger} from "./merger/StopTimesMerger";
import {ShapesMerger} from "./merger/ShapesMerger";
import {FrequenciesMerger} from "./merger/FrequenciesMerger";
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
    private readonly feedInfo: FeedInfoMerger,
    private readonly shapes: ShapesMerger,
    private readonly frequencies: FrequenciesMerger
  ) {}

  /**
   * Merge in the given GTFS data set and push the new items to the file streams.
   *
   * The order is what the re-indexing needs: routes and calendars give the maps
   * the trips are indexed against, the trips give the map the stop times and the
   * couplings are indexed against, and the stop times say which stops anything
   * actually calls at.
   *
   * The calls and the shapes arrive as a reader rather than as rows, because that
   * order is also the reason they need not be held: nothing can be done with
   * either until the trips have been numbered, and nothing needs them afterwards.
   * They are read together, in one pass over the file.
   */
  public async write(gtfs: GTFSZip, stream: FeedStream): Promise<void> {
    const [routeIdMap, serviceIdMap] = await Promise.all([
      this.routes.write(gtfs.routes),
      this.calendar.write(gtfs.calendars, gtfs.calendarDates)
    ]);

    const [tripIdMap, shapeIdMap] = await this.trips.write(gtfs.trips, serviceIdMap, routeIdMap);

    this.feedInfo.write(gtfs.feedInfo);

    const stopTimes = this.stopTimes.begin(tripIdMap);
    const shapes = this.shapes.begin(shapeIdMap);
    const flush = async () => {
      await stopTimes.flush();
      await shapes.flush();
    };

    await stream({stopTime: row => stopTimes.row(row), shape: row => shapes.row(row)}, flush);

    // The reader's last rows arrive after its last chunk, as the inflater and
    // the parser give up what they were holding.
    await flush();

    // A stop is published if something calls at it, or if it is the station
    // above one that does: a station nothing stops at is still where its
    // platforms are, and both the areas and the transfers name stations.
    const published = {...stopTimes.usedStops};

    for (const stop of Object.keys(stopTimes.usedStops)) {
      const parent = gtfs.parentStops[stop];

      if (parent !== undefined) {
        published[parent] = true;
      }
    }

    await this.frequencies.write(gtfs.frequencies, tripIdMap);

    await Promise.all([
      this.stopsAndTransfers.write(
        gtfs.stops, gtfs.transfers, gtfs.parentStops, published, tripIdMap
      ),
      this.agencies.write(gtfs.agencies),
      this.attributions.write(gtfs.attributions),
      this.areas.write(gtfs.areas, gtfs.stopAreas, gtfs.parentStops, published)
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
      this.feedInfo.end(),
      this.shapes.end(),
      this.frequencies.end()
    ]);
  }
}
