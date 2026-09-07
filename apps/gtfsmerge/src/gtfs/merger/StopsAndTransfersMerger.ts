import {RowWriter, StopID, StopRow, TransferRow, TransferType} from "@gb-transit/gtfs-schema";
import CheapRuler from "cheap-ruler";
import {UsedStops} from "./StopTimesMerger";
import {TripIDMap} from "./TripsMerger";
import {close, push} from "./Push";

export class StopsAndTransfersMerger {

  private readonly stopLocations: Record<StopID, [number, number]> = {};

  constructor(
    private readonly stops: RowWriter<StopRow>,
    private readonly transfers: RowWriter<TransferRow>,
    private readonly ruler: CheapRuler,
    private readonly transferDistance: number
  ) {}

  /**
   * Write the transfers, then the stops that were called at, adding a transfer
   * between any two stops close enough to walk between.
   */
  public async write(
    stops: StopRow[],
    transfers: TransferRow[],
    parentStops: ParentStops,
    usedStops: UsedStops,
    tripIdMap: TripIDMap
  ): Promise<void> {
    const existingTransfers = await this.writeTransfers(
      transfers, parentStops, tripIdMap, usedStops
    );

    return this.writeStops(stops, existingTransfers, usedStops);
  }

  private async writeTransfers(
    transfers: TransferRow[],
    parentStops: ParentStops,
    tripIdMap: TripIDMap,
    usedStops: UsedStops
  ): Promise<ExistingTransfers> {
    const existingTransfers: ExistingTransfers = {};

    for (const transfer of transfers) {
      transfer.from_stop_id = parentStops[transfer.from_stop_id] || transfer.from_stop_id;
      transfer.to_stop_id = parentStops[transfer.to_stop_id] || transfer.to_stop_id;

      // Only the stops something calls at are published, so a transfer to one
      // that is not would be a reference to a row that is not in the feed. A
      // rail feed publishes a station because a fixed link reaches it, and this
      // does not, so this is where the two disagree.
      if (!usedStops[transfer.from_stop_id] || !usedStops[transfer.to_stop_id]) {
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
    usedStops: UsedStops
  ): Promise<void> {
    for (const stop of stops) {
      if (usedStops[stop.stop_id]) {
        // Every published stop is one something calls at, and a call may not be
        // at a station. The merge drops the child stops and moves their calls
        // onto the parent, so a parent that arrived as location_type 1 with
        // platforms beneath it leaves here as an ordinary stop with none - which
        // is what the merged feed actually contains. Left alone the validator
        // rejects it three ways over: location_with_unexpected_stop_time,
        // transfer_with_invalid_stop_location_type and
        // transfer_with_invalid_trip_and_stop.
        stop.location_type = 0;
        stop.parent_station = null;

        await push(this.stops, stop);

        const lat = Number(stop.stop_lat);
        const lon = Number(stop.stop_lon);

        if (this.transferDistance && !this.stopLocations[stop.stop_id] && lon !== 0 && lat !== 0) {
          // [longitude, latitude], which is the order cheap-ruler takes and the
          // order GeoJSON puts them in. This used to pass [lat, lon], so every
          // generated distance was wrong by a factor of 1/cos(latitude) on one
          // axis - 557m for a gap of 328m at 54N.
          await this.addNearbyStops(stop, [lon, lat], existingTransfers);
        }
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
    for (const stopId in this.stopLocations) {
      const exists = existingTransfers[stop.stop_id]?.[stopId];
      const reverseExists = existingTransfers[stopId]?.[stop.stop_id];

      // Both, not either. addTransfers writes the pair, so generating when only
      // one direction is missing writes a second copy of the one that is not -
      // and transfers.txt is the file the merge does not deduplicate.
      if (!exists && !reverseExists) {
        const distance = this.ruler.distance(coords, this.stopLocations[stopId]);

        if (distance < this.transferDistance) {
          await this.addTransfers(stop.stop_id, stopId, distance);
        }
      }
    }

    this.stopLocations[stop.stop_id] = coords;
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
