
import {Field, ParseError} from "./Field";

export class BooleanField extends Field {

  constructor(
    public readonly start: number,
    public readonly nullable: boolean = false,
    public readonly truthyChars: string[] = ["Y", "1"],
    public readonly falseChars: string[] = ["N", "0"],
    public readonly nullChars: string[] = []
  ) {
    super(start, 1, nullable, nullChars);
  }

  /**
   * Turn a single character field into a 1 or 0
   */
  protected parse(value: string): number {
    if (this.truthyChars.indexOf(value) >= 0) {
      return 1;
    }
    else if (this.falseChars.indexOf(value) >= 0) {
      return 0;
    }
    else {
      throw new ParseError(`Unable to interpret "${value}" as boolean`);
    }
  }

}