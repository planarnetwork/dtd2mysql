
import {Field} from "./Field";

export class TimeField extends Field {

  constructor(start: number, length: number, nullable: boolean = true, nullChars: string[] = [" ", "0"]) {
    super(start, length, nullable, nullChars);
  }

  /**
   * 0745 -> 07:45:00
   * 0745H -> 07:45:30
   */
  protected parse(value: string): string {
    const minsAndSeconds = `${value.substr(0, 2)}:${value.substr(2, 2)}`;

    return this.length === 5 && value.charAt(4) === "H" ? minsAndSeconds + ":30" : minsAndSeconds + ":00";
  }

}