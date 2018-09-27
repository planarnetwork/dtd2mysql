import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChange} from "../transxchange/TransXChange";
import {ATCOCode, NaPTANIndex, StopLocationIndex} from "../reference/NaPTAN";

/**
 * Calculate transfers between stops
 */
export class TransfersStream extends GTFSFileStream<TransXChange> {
  private readonly stopsSeen: Record<ATCOCode, boolean> = {};
  protected header = "from_stop_id,to_stop_id,transfer_type,min_transfer_time";

  constructor(private readonly naptan: NaPTANIndex, private readonly naptanByLocation: StopLocationIndex) {
    super();
  }

  /**
   * Add a transfer from each stop to itself (as interchange time) then find any nearby stops and calculate the time
   * required to walk to them.
   */
  protected transform(data: TransXChange): void {
    for (const stop of data.StopPoints) {
      if (!this.stopsSeen[stop.StopPointRef]) {
        this.pushLine(`${stop.StopPointRef},${stop.StopPointRef},2,180`);

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
    const aLon = Number(this.naptan[stop][7]);
    const aLat = Number(this.naptan[stop][8]);
    const key = this.naptan[stop][6] || this.naptan[stop][5];

    for (const j of this.naptanByLocation[key]) {
      if (this.naptan[j] && this.stopsSeen[j]) {
        const distance = this.getDistance(aLon, aLat, Number(this.naptan[j][7]), Number(this.naptan[j][8]));

        if (distance < 0.01) {
          const time = Math.max(60, Math.round((distance / 0.0005) * 120));
          this.pushLine(`${stop},${j},2,${time}`);
          this.pushLine(`${j},${stop},2,${time}`);
        }
      }
    }
  }

  /**
   * Note this method of calculating distances between stations is flawed and only used as a rough guide.
   */
  private getDistance(aLon: number, aLat: number, bLon: number, bLat: number) {
    return Math.abs(bLat - aLat) + Math.abs(bLon - aLon);
  }
}

