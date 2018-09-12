import {TransXChange, StopPoint} from "../transxchange/TransXChange";
import autobind from "autobind-decorator";
import {NaPTANIndex} from "../reference/NaPTAN";

/**
 * Function that will return a reference.txt file when given a TransXChange object
 */
export type GetStops = (data: TransXChange) => string;

@autobind
export class StopsFactory {

  private static readonly STREET_BLACKLIST = ["Road", "Street", "Lane", "Avenue"];

  constructor(
    private readonly naptan: NaPTANIndex
  ) {}

  public getStops(data: TransXChange): string {
    return "stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,stop_url,location_type,parent_station\n"
      + data.stops.map(this.getStop).join("\n");
  }

  private getStop(stop: StopPoint): string {
    return this.naptan[stop.StopPointRef] ? this.getNaPTANStop(this.naptan[stop.StopPointRef]) : this.getFeedStop(stop);
  }

  private getNaPTANStop([atcoCode, naptanCode, name, street, indicator, locality, parent, lng, lat]: string[]): string {
    const specificStreet = this.shouldAddStreet(name, street) ? ", " + street : "";
    const specificLocation = indicator !== "" ? " (" + indicator.replace("->", "") + ")" : "";
    const city = parent || locality;

    return `${atcoCode},${naptanCode},"${name}${specificLocation}${specificStreet}, ${city}",${name},${lat},${lng},,,`;
  }

  private getFeedStop(stop: StopPoint): string {
    return `${stop.StopPointRef},,"${stop.CommonName}, ${stop.LocalityQualifier}",,0.00,0.00,,,`;
  }

  /**
   * If the name is not the same as the street name and does not contain any words like Road or Street we can safely
   * add the street name to the name.
   */
  private shouldAddStreet(name: string, street: string): boolean {
    return street.length > 1
      && name !== street
      && street !== "---"
      && StopsFactory.STREET_BLACKLIST.every(i => !name.includes(i));
  }
}

