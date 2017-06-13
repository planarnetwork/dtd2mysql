
import {Field} from "./Field";

/**
 * DTD date field (e.g. 3112999)
 */
export class DateField extends Field {

  constructor(start: number, nullable: boolean = false) {
    super(start, 8, nullable, [" ", "*", "0"]);
  }

  /**
   * Turn a DTD formatted date into a MySQL formatted date
   */
  protected parse(value: string): string {
    return `${value.substr(4, 4)}-${value.substr(2, 2)}-${value.substr(0, 2)}`;
  }

}

/**
 * Short format DTD date (e.g. 170531)
 */
export class ShortDateField extends Field {

  constructor(start: number, nullable: boolean = false) {
    super(start, 6, nullable, [" ", "*", "0"]);
  }

  /**
   * Turn a DTD formatted date into a MySQL formatted date
   */
  protected parse(value: string): string {
    if (value === "999999") return "2099-12-31";
    else return `20${value.substr(0, 2)}-${value.substr(2, 2)}-${value.substr(4, 2)}`;
  }

}
