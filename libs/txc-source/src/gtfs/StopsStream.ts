import {StopRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {STOPS} from "./TxcFeed";
import {TransXChange, StopPoint} from "../transxchange/TransXChange";
import {ATCOCode, NaPTANIndex, NaptanStopPoint} from "../reference/NaPTAN";

export class StopsStream extends RowStream<TransXChange, StopRow> {
  public readonly file = STOPS;

  private static readonly STREET_BLACKLIST = ["Road", "Street", "Lane", "Avenue"];
  private readonly seenStops: Record<ATCOCode, boolean> = {};

  constructor(private readonly naptan: NaPTANIndex) {
    super();
  }

  protected transform(data: TransXChange): void {
    for (const stop of data.StopPoints) {
      if (!this.seenStops[stop.StopPointRef]) {
        this.pushRow(this.getStop(stop));
        this.seenStops[stop.StopPointRef] = true;
      }
    }
  }

  private getStop(stop: StopPoint): StopRow {
    const known = this.naptan[stop.StopPointRef];

    return known ? this.getNaPTANStop(known) : this.getFeedStop(stop);
  }

  private getNaPTANStop(stop: NaptanStopPoint): StopRow {
    const specificStreet = this.shouldAddStreet(stop.name, stop.street) ? ", " + stop.street : "";
    const specificLocation = stop.indicator !== "" ? " (" + stop.indicator.replace("->", "") + ")" : "";
    const city = stop.parentLocality || stop.locality;

    return {
      stop_id: stop.atcoCode,
      stop_code: stop.naptanCode,
      stop_name: stop.name + specificLocation + specificStreet + ", " + city,
      stop_desc: stop.name,
      stop_lat: stop.latitude,
      stop_lon: stop.longitude,
      zone_id: "",
      stop_url: "",
      location_type: null,
      parent_station: "",
      platform_code: null,
      stop_timezone: "",
      wheelchair_boarding: 0
    };
  }

  private getFeedStop(stop: StopPoint): StopRow {
    return {
      stop_id: stop.StopPointRef,
      stop_code: "",
      stop_name: stop.CommonName + ", " + stop.LocalityQualifier,
      stop_desc: "",
      stop_lat: stop.Location.Latitude,
      stop_lon: stop.Location.Longitude,
      zone_id: "",
      stop_url: "",
      location_type: null,
      parent_station: "",
      platform_code: null,
      stop_timezone: "",
      wheelchair_boarding: 0
    };
  }

  /**
   * If the name is not the same as the street name and does not contain any words like Road or Street we can safely
   * add the street name to the name.
   */
  private shouldAddStreet(name: string, street: string): boolean {
    return street.length > 1
      && name !== street
      && street !== "---"
      && StopsStream.STREET_BLACKLIST.every(i => !name.includes(i));
  }
}
