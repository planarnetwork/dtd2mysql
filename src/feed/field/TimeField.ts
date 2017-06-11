
import {Field} from "./Field";

export class TimeField extends Field {

  constructor(start: number, nullable: boolean = false) {
    super(start, 4, nullable);
  }

  /**
   * 0745 -> 07:45
   */
  protected parse(value: string): string {
    return `${value.substr(0, 2)}:${value.substr(2, 2)}`;
  }

}