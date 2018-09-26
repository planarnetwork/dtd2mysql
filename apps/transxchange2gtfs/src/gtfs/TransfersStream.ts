import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChange} from "../transxchange/TransXChange";
import {ATCOCode, NaPTANIndex} from "../reference/NaPTAN";

/**
 * Calculate transfers between stops
 */
export class TransfersStream extends GTFSFileStream<TransXChange> {
  private stopsSeen: Record<ATCOCode, boolean> = {};
  protected header = "from_stop_id,to_stop_id,transfer_type,min_transfer_time";

  constructor(private readonly naptan: NaPTANIndex) {
    super();
  }

  protected transform(data: TransXChange): void {
    for (const stop of data.StopPoints) {
      if (!this.stopsSeen[stop.StopPointRef]) {
        this.stopsSeen[stop.StopPointRef] = true;

        this.pushLine(`${stop.StopPointRef},${stop.StopPointRef},2,180`);

        if (this.naptan[stop.StopPointRef]) {
          this.addNearbyStops(stop.StopPointRef);
        }
      }
    }
  }

  /**
   * Search any stops we've seen to see if we can walk there
   */
  private addNearbyStops(stop: ATCOCode): void {
    const aLon = Number(this.naptan[stop][7]);
    const aLat = Number(this.naptan[stop][8]);

    for (const j in this.stopsSeen) {
      if (j !== stop && this.naptan[j]) {
        const distance = this.getDistance(aLon, aLat, Number(this.naptan[j][7]), Number(this.naptan[j][8]));

        if (distance < 0.01) {
          const time = Math.max(60, Math.round((distance / 0.0005) * 60));
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

