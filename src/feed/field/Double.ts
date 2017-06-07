
import Field from "./Field";

export default class Double extends Field {
  public nullChars = [" ", "*", "9"];
  private readonly decimalDigits: number;

  constructor(position: number, length: number, decimalDigits: number, isNullable: boolean = false) {
    super(position, length, isNullable);

    this.decimalDigits = decimalDigits;
  }


  getValue(value: string | null): number {
    if (value === null) {
      return null;
    }

    const floatValue = parseFloat(value);

    if (isNaN(floatValue)) {
      throw new Error(`Error parsing int: "${value}" at position ${this.position}`);
    }

    return floatValue;
  }

  getType() {
    return `DOUBLE(${this.length}, ${this.decimalDigits}) unsigned`;
  }

}