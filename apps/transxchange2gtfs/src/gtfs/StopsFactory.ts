import {TransXChange} from "../transxchange/TransXChange";
import autobind from "autobind-decorator";
import {NaPTANIndex} from "../reference/NaPTAN";

/**
 * Function that will return a reference.txt file when given a TransXChange object
 */
export type GetStops = (data: TransXChange) => string;

@autobind
export class StopsFactory {

  constructor(
    private readonly naptan: NaPTANIndex
  ) {}

  public getStops(data: TransXChange): string {
    return "";
  }

}

