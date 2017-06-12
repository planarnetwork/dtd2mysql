
import {Field, ParseError} from "./Field";

export class IntField extends Field {

  constructor(position: number,
              length: number,
              nullable: boolean = false,
              nullChars: string[] = [" ", "*", "9"]) {
    super(position, length, nullable, nullChars)
  }

  /**
   * Try to process this string as an integer
   */
  protected parse(value: string): number {
    const intValue = parseInt(value);

    if (isNaN(intValue)) {
      throw new ParseError(`Error parsing int: "${value}" isNaN`);
    }

    return intValue;
  }

}

export class ZeroFillIntField extends IntField {}