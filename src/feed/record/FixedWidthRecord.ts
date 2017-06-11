
import {Field, FieldValue} from "../field/Field";
import {FieldMap, Record} from "./Record";
import memoize from "memoized-class-decorator";

export class FixedWidthRecord implements Record {

  constructor(
    public readonly name: string,
    public readonly key: string[],
    public readonly fields: FieldMap,
    public readonly indexes: string[] = []
  ) {}

  @memoize
  private get fieldValues(): Field[] {
    return Object.values(this.fields);
  }

  /**
   * Extract the relevant part of the line for each field and then get the value from the field
   */
  public extractValues(line: string): FieldValue[] {
    const values = this.fieldValues.map(f => f.extract(line.substr(f.position, f.length)));
    const result: FieldValue[] = [null];

    return result.concat(values);
  }

}

