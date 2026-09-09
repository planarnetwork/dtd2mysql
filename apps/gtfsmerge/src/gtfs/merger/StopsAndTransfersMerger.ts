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
   * The stops to write, held until every feed has been read.
   *
   * A stop_code is only worth writing if it names one station, and whether it
   * does is a question about the merged feed rather than about the feed in hand:
   * a code can be shared by two feeds. So the rows wait, and the answer is
   * worked out in `end`.
   */
  private readonly published: StopRow[] = [];

  /** Which stops carry each code, by the station they belong to. */
  private readonly codes = new Map<string, Set<StopID>>();

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
   * `published` is every stop the merged feed will contain - what something
   * calls at, and the stations above those - worked out by the caller, because
   * the areas have to ask the same question and get the same answer.
   */
  public async write(
    stops: StopRow[],
    transfers: TransferRow[],
    parentStops: ParentStops,
    published: UsedStops,
    tripIdMap: TripIDMap
  ): Promise<void> {
    Object.assign(this.parents, parentStops);

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
      this.published.push(stop);

      const code = stop.stop_code;

      if (code) {
        // The station it belongs to, which is itself when it has none. Two
        // platforms of one station collapse to the station and keep their
        // shared code; two unrelated stops stay two and lose it.
        const place = this.parents[stop.stop_id] ?? stop.stop_id;
        const carrying = this.codes.get(String(code));

        if (carrying === undefined) {
          this.codes.set(String(code), new Set([place]));
        }
        else {
          carrying.add(place);
        }
      }

      const lat = Number(stop.stop_lat);
      const lon = Number(stop.stop_lon);

      // Only a stop that is a place in its own right: a station, or a stop with
      // no station above it. A platform's interchange is its station's, because
      // parent_station already says a rider reaching the station reaches every
      // platform under it - so generating from the platforms as well would write
      // one walk once per platform and offer it as several journeys.
      const isChild = this.parents[stop.stop_id] !== undefined;

      if (this.transferDistance && !isChild && !this.stopLocations[stop.stop_id]
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

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const [stopId, other] of this.cells.get(`${x + dx}:${y + dy}`) ?? []) {
          const exists = existingTransfers[stop.stop_id]?.[stopId];
          const reverseExists = existingTransfers[stopId]?.[stop.stop_id];

          // Both, not either. addTransfers writes the pair, so generating when
          // only one direction is missing writes a second copy of the one that
          // is not - and transfers.txt is the file the merge does not
          // deduplicate.
          if (!exists && !reverseExists) {
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
    let cleared = 0;

    for (const stop of this.published) {
      const code = stop.stop_code;

      // A code on stops from more than one station names none of them: an app
      // given it cannot say which stop a rider meant, and the codes really are
      // shared - by two sides of one road, and by two places miles apart.
      if (code && (this.codes.get(String(code))?.size ?? 0) > 1) {
        stop.stop_code = null;
        cleared++;
      }

      await push(this.stops, stop);
    }

    if (cleared > 0) {
      console.warn(
        `${cleared} stops carried a stop_code that more than one station uses. `
        + "The code is left out of those rows, because it cannot say which stop it means."
      );
    }

    await Promise.all([close(this.stops), close(this.transfers)]);
  }

}

type ExistingTransfers = Record<StopID, Record<StopID, true>>;
export type ParentStops = Record<StopID, StopID>;
