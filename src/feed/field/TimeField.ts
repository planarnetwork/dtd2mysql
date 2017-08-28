
import {Field} from "./Field";

export class TimeField extends Field {

  constructor(start: number, nullable: boolean = false, nullChars: string[] = [" ", "*"]) {
    super(start, 5, nullable, nullChars);
  }

  /**
   * 0745 -> 07:45:00
   * 0745H -> 07:45:30
   */
  protected parse(value: string): string {
    const minsAndSeconds = `${value.substr(0, 2)}:${value.substr(2, 2)}`;

    return value.charAt(4) === "H" ? minsAndSeconds + ":30" : minsAndSeconds + ":00";
  }

}