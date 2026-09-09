import {RowWriter, StopID, StopRow, TransferRow, TransferType} from "@gb-transit/gtfs-schema";
import CheapRuler from "cheap-ruler";
import {UsedStops} from "./StopTimesMerger";
import {TripIDMap} from "./TripsMerger";
import {close, push} from "./Push";

export class StopsAndTransfersMerger {

  private readonly stopLocations: Record<StopID, [number, number]> = {};

  /**
   * The stops seen so far, in cells one transfer distance wide.
   *
   * Two stops close enough to walk between are in the same cell or in one of the
   * eight around it, so a stop is compared against those nine rather than
   * against every stop seen so far. That comparison was the whole cost of a
   * merge at any size worth the name: 321,570 stops is 51.7 billion pairs, about
   * four hours, against a few seconds for the same answer here.
   */
  private readonly cells = new Map<string, [StopID, [number, number]][]>();

  /** Kilometres per degree of longitude and of latitude, at the ruler's latitude. */
  private scale?: [number, number];

  /**
   * Every feed's parents, not just the one being written.
   *
   * Which station a stop is under is asked across the merged feed - the rail
   * platform comes from one feed and the bus stop outside it from another - and
   * a map holding only the feed in hand answers no for the pair that matters.
   */
  private readonly parents: ParentStops = {};

  constructor(
    private readonly stops: RowWriter<StopRow>,
    private readonly transfers: RowWriter<TransferRow>,
    private readonly ruler: CheapRuler,
    private readonly transferDistance: number
  ) {}

  /**
   * Write the transfers, then the stops that are published, adding a transfer
   * between any two stops close enough to walk between.
   *
   * A stop is published if something calls at it, or if it is the station above
   * one that is: a station nothing stops at is still where the platforms under
   * it are, and dropping it would leave every one of them pointing at a row that
   * is not in the feed.
   */
  public async write(
    stops: StopRow[],
    transfers: TransferRow[],
    parentStops: ParentStops,
    usedStops: UsedStops,
    tripIdMap: TripIDMap
  ): Promise<void> {
    Object.assign(this.parents, parentStops);

    const published: UsedStops = {...usedStops};

    for (const stop of Object.keys(usedStops)) {
      const parent = parentStops[stop];

      if (parent !== undefined) {
        published[parent] = true;
      }
    }

    const existingTransfers = await this.writeTransfers(transfers, tripIdMap, published);

    return this.writeStops(stops, existingTransfers, published);
  }

  private async writeTransfers(
    transfers: TransferRow[],
    tripIdMap: TripIDMap,
    published: UsedStops
  ): Promise<ExistingTransfers> {
    const existingTransfers: ExistingTransfers = {};

    for (const transfer of transfers) {
      // A transfer names whichever stop the feed named - a station where the
      // walk is between stations, a platform where it is between platforms - and
      // both are published now, so neither has to be moved. A transfer to a stop
      // that is not published would be a reference to a row that is not there.
      if (!published[transfer.from_stop_id] || !published[transfer.to_stop_id]) {
        continue;
      }

      // A transfer_type 4 names the two trips it couples, and the trips have
      // just been re-indexed. Left alone it would point at trip ids from the
      // input feed, which is a dangling reference in the merged one.
      if (transfer.from_trip_id !== undefined && transfer.from_trip_id !== null) {
        const from = tripIdMap[transfer.from_trip_id];
        const to = transfer.to_trip_id ? tripIdMap[transfer.to_trip_id] : undefined;

        // Either trip having been dropped takes the coupling with it.
        if (from === undefined || to === undefined) {
          continue;
        }

        transfer.from_trip_id = from;
        transfer.to_trip_id = to;
      }

      await push(this.transfers, transfer);

      (existingTransfers[transfer.from_stop_id] ||= {})[transfer.to_stop_id] = true;
    }

    return existingTransfers;
  }

  private async writeStops(
    stops: StopRow[],
    existingTransfers: ExistingTransfers,
    published: UsedStops
  ): Promise<void> {
    for (const stop of stops) {
      if (!published[stop.stop_id]) {
        continue;
      }

      // location_type and parent_station are the feed's own. A station keeps its
      // platforms and a platform keeps its station, which is what says that two
      // stops on either side of a road, or two platforms of one interchange, are
      // one place to a rider.
      await push(this.stops, stop);

      const lat = Number(stop.stop_lat);
      const lon = Number(stop.stop_lon);

      // A station is where its platforms are, so a walk to one of them is a walk
      // to all of them: generating from the platforms alone is the same set of
      // journeys without the duplicates.
      const isStation = Number(stop.location_type) === 1;

      if (this.transferDistance && !isStation && !this.stopLocations[stop.stop_id]
        && lon !== 0 && lat !== 0) {
        // [longitude, latitude], which is the order cheap-ruler takes and the
        // order GeoJSON puts them in. This used to pass [lat, lon], so every
        // generated distance was wrong by a factor of 1/cos(latitude) on one
        // axis - 557m for a gap of 328m at 54N.
        await this.addNearbyStops(stop, [lon, lat], existingTransfers);
      }
    }
  }

  /**
   * Search any stops we've seen to see if we can walk there
   */
  private async addNearbyStops(
    stop: StopRow,
    coords: [number, number],
    existingTransfers: ExistingTransfers
  ): Promise<void> {
    const [x, y] = this.cellOf(coords);
    const parent = this.parents[stop.stop_id];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const [stopId, other] of this.cells.get(`${x + dx}:${y + dy}`) ?? []) {
          const exists = existingTransfers[stop.stop_id]?.[stopId];
          const reverseExists = existingTransfers[stopId]?.[stop.stop_id];

          // Two stops under one station are already one place: parent_station
          // says so, and a walk between them is a row saying it again.
          const together = parent !== undefined && parent === this.parents[stopId];

          // Both, not either. addTransfers writes the pair, so generating when
          // only one direction is missing writes a second copy of the one that
          // is not - and transfers.txt is the file the merge does not
          // deduplicate.
          if (!exists && !reverseExists && !together) {
            const distance = this.ruler.distance(coords, other);

            if (distance < this.transferDistance) {
              await this.addTransfers(stop.stop_id, stopId, distance);
            }
          }
        }
      }
    }

    const key = `${x}:${y}`;
    const cell = this.cells.get(key);

    if (cell === undefined) {
      this.cells.set(key, [[stop.stop_id, coords]]);
    }
    else {
      cell.push([stop.stop_id, coords]);
    }

    this.stopLocations[stop.stop_id] = coords;
  }

  /**
   * Which cell a point is in, measured with the same ruler the distances are, so
   * that a cell really is one transfer distance across.
   *
   * Cheap Ruler flattens the earth at one latitude, so a degree is worth the
   * same everywhere it measures and the scale is two numbers rather than a
   * projection.
   */
  private cellOf([lon, lat]: [number, number]): [number, number] {
    this.scale ??= [
      this.ruler.distance([0, 0], [1, 0]),
      this.ruler.distance([0, 0], [0, 1])
    ];

    return [
      Math.floor(lon * this.scale[0] / this.transferDistance),
      Math.floor(lat * this.scale[1] / this.transferDistance)
    ];
  }

  private addTransfers(stopA: StopID, stopB: StopID, distance: number): Promise<unknown> {
    const min_transfer_time = Math.max(60, Math.round(distance * 1000));
    const type = TransferType.MinTime;

    return Promise.all([
      push(this.transfers, {
        from_stop_id: stopA, to_stop_id: stopB, transfer_type: type, min_transfer_time
      }),
      push(this.transfers, {
        from_stop_id: stopB, to_stop_id: stopA, transfer_type: type, min_transfer_time
      })
    ]);
  }

  public async end(): Promise<void> {
    await Promise.all([close(this.stops), close(this.transfers)]);
  }

}

type ExistingTransfers = Record<StopID, Record<StopID, true>>;
export type ParentStops = Record<StopID, StopID>;
