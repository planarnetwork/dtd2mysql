
import {Field} from "./Field";

export class TextField extends Field {

  /**
   * Return the string as is
   */
  protected parse(value: string): string {
    return value;
  }

}

export class VariableLengthText extends TextField {}