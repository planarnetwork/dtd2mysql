
import {Field, ParseError} from "./Field";

export class DoubleField extends Field {

  constructor(position: number, length: number, public readonly decimalDigits: number, isNullable: boolean = false) {
    super(position, length, isNullable, [" ", "*", "9"]);
  }

  /**
   * Cast to a number
   */
  protected parse(value: string): number {
    const floatValue = parseFloat(value);

    if (isNaN(floatValue)) {
      throw new ParseError(`Error parsing float: "${value}"`);
    }

    return floatValue;
  }

}