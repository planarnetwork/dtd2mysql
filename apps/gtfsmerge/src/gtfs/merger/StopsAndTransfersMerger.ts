import { Stop, StopID, Transfer } from "../GTFS";
import { Writable } from "stream";
import { CheapRuler } from "cheap-ruler";

export class StopsAndTransfersMerger {
  private readonly stopLocations = {};

  constructor(
    private readonly stops: Writable,
    private readonly transfers: Writable,
    private readonly ruler: CheapRuler,
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

      existingTransfers[transfer.from_stop_id] = existingTransfers[transfer.from_stop_id] || {};
      existingTransfers[transfer.from_stop_id][transfer.to_stop_id] = true;
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

        if (this.transferDistance && stop.stop_lon !== 0 && stop.stop_lat !== 0) {
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
    const aCoords = [stop.stop_lat, stop.stop_lon] as [number, number];

    for (const stopId in this.stopLocations) {
      const exists = existingTransfers[stop.stop_id] && existingTransfers[stop.stop_id][stopId];
      const reverseExists = existingTransfers[stopId] && existingTransfers[stopId][stop.stop_id];

      if (!exists || !reverseExists) {
        const distance = this.ruler.distance(aCoords, this.stopLocations[stopId]);

        if (distance < this.transferDistance) {
          await this.addTransfers(stop.stop_id, stopId, distance);
        }
      }
    }

    this.stopLocations[stop.stop_id] = aCoords;
  }

  private addTransfers(stopA: StopID, stopB: StopID, distance: number): Promise<void[]> {
    const duration = Math.max(60, Math.round(distance * 720));
    const transfer = { from_stop_id: stopA, to_stop_id: stopB, transfer_type: 2, min_transfer_time: duration };
    const reverse = { from_stop_id: stopB, to_stop_id: stopA, transfer_type: 2, min_transfer_time: duration };

    return Promise.all([
      this.push(this.transfers, transfer),
      this.push(this.transfers, reverse),
    ]);
  }

  private push(stream: Writable, data: any): Promise<void> | void {
    const writable = stream.write(data);

    if (!writable) {
      return new Promise(resolve => stream.once("drain", resolve));
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

type ExistingTransfers = Record<StopID, Record<StopID, true>>;
export type ParentStops = Record<StopID, StopID>;
