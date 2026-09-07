import {TransferRow, TransferType} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {TRANSFERS} from "./TxcFeed";
import {TransXChange} from "../transxchange/TransXChange";
import {ATCOCode, NaPTANIndex, StopLocationIndex} from "../reference/NaPTAN";

/**
 * Calculate transfers between stops
 */
export class TransfersStream extends RowStream<TransXChange, TransferRow> {
  public readonly file = TRANSFERS;

  private readonly stopsSeen: Record<ATCOCode, boolean> = {};

  constructor(
    private readonly naptan: NaPTANIndex,
    private readonly naptanByLocation: StopLocationIndex
  ) {
    super();
  }

  /**
   * Add a transfer from each stop to itself (as interchange time) then find any nearby stops and calculate the time
   * required to walk to them.
   */
  protected transform(data: TransXChange): void {
    for (const stop of data.StopPoints) {
      if (!this.stopsSeen[stop.StopPointRef]) {
        this.pushTransfer(stop.StopPointRef, stop.StopPointRef, 180);

        if (this.naptan[stop.StopPointRef]) {
          this.addNearbyStops(stop.StopPointRef);
        }

        this.stopsSeen[stop.StopPointRef] = true;
      }
    }
  }

  /**
   * Search any stops we've seen to see if we can walk there
   */
  private addNearbyStops(stop: ATCOCode): void {
    const here = this.naptan[stop];
    const aLon = Number(here.longitude);
    const aLat = Number(here.latitude);
    const key = here.parentLocality || here.locality;

    for (const j of this.naptanByLocation[key] ?? []) {
      const other = this.naptan[j];

      if (other && this.stopsSeen[j]) {
        const distance = this.getDistance(aLon, aLat, Number(other.longitude), Number(other.latitude));

        if (distance < 0.01) {
          const time = Math.max(60, Math.round((distance / 0.0005) * 120));

          this.pushTransfer(stop, j, time);
          this.pushTransfer(j, stop, time);
        }
      }
    }
  }

  private pushTransfer(from: ATCOCode, to: ATCOCode, seconds: number): void {
    this.pushRow({
      from_stop_id: from,
      to_stop_id: to,
      transfer_type: TransferType.MinTime,
      min_transfer_time: seconds
    });
  }

  /**
   * Note this method of calculating distances between stations is flawed and only used as a rough guide.
   */
  private getDistance(aLon: number, aLat: number, bLon: number, bLat: number) {
    return Math.abs(bLat - aLat) + Math.abs(bLon - aLon);
  }
}
