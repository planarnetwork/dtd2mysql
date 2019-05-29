import { Stop, StopID, Transfer } from "../GTFS";
import { Writable } from "stream";

export class StopsAndTransfersMerger {
  private readonly stopLocations = {};

  constructor(
    private readonly stops: Writable,
    private readonly transfers: Writable,
    private readonly transferDistance: number
  ) {}

  /**
   * Write the transfers and return an index of all transfers, then write the stops
   * adding any missing transfers to stops that are within walking distance of each other
   */
  public async write(stops: Stop[], transfers: Transfer[]): Promise<ParentStops> {
    const existingTransfers = await this.writeTransfers(transfers);

    return this.writeStops(stops, existingTransfers);
  }

  private async writeTransfers(transfers: Transfer[]): Promise<ExistingTransfers> {
    const existingTransfers = {};

    for (const transfer of transfers) {
      await this.push(this.transfers, transfer);

      existingTransfers[transfer.from_stop_id + "," + transfer.to_stop_id] = true;
    }

    return existingTransfers;
  }

  private async writeStops(stops: Stop[], existingTransfers: ExistingTransfers): Promise<ParentStops> {
    const parentStops = {};

    for (const stop of stops) {
      if (stop.parent_station) {
        parentStops[stop.stop_id] = stop.parent_station;
      }
      else {
        await this.push(this.stops, stop);

        if (stop.stop_lon !== 0 && stop.stop_lat !== 0) {
          await this.addNearbyStops(stop, existingTransfers);
        }
      }
    }

    return parentStops;
  }

  /**
   * Search any stops we've seen to see if we can walk there
   */
  private async addNearbyStops(stop: Stop, existingTransfers: ExistingTransfers): Promise<void> {
    const aLon = stop.stop_lon;
    const aLat = stop.stop_lat;

    for (const stopId in this.stopLocations) {
      const [bLon, bLat] = this.stopLocations[stopId];
      const key = stop.stop_id + "," + stopId;
      const reverseKey = stopId + "," + stop.stop_id;

      if (!existingTransfers[key] || !existingTransfers[reverseKey]) {
        const distance = this.getDistance(aLon, aLat, bLon, bLat);

        if (distance < this.transferDistance) {
          const t = Math.max(60, Math.round(distance * 72000));
          const transfer = { from_stop_id: stop.stop_id, to_stop_id: stopId, transfer_type: 2, min_transfer_time: t };
          const reverse = { from_stop_id: stopId, to_stop_id: stop.stop_id, transfer_type: 2, min_transfer_time: t };

          await Promise.all([
            this.push(this.transfers, transfer),
            this.push(this.transfers, reverse),
          ]);
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

  private push(stream: Writable, data: any): Promise<void> | void {
    const writable = stream.write(data);

    if (!writable) {
      return new Promise(resolve => stream.once("drain", () => resolve()));
    }
  }

  /**
   * Flush all the data to the output stream
   */
  public async end(): Promise<void[]> {
    return Promise.all([
      new Promise(resolve => this.stops.end(resolve)),
      new Promise(resolve => this.transfers.end(resolve))
    ]);
  }

}

type ExistingTransfers = Record<string, true>;
export type ParentStops = Record<StopID, StopID>;
