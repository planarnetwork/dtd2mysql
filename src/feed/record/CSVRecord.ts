
import {Field, FieldValue} from "../field/Field";
import {FieldMap, Record} from "./Record";
import memoize from "memoized-class-decorator";

export class CSVRecord implements Record {

  constructor(
    public readonly name: string,
    public readonly key: string[],
    public readonly fields: FieldMap,
    public readonly indexes: string[] = [],
    public readonly fieldDelimiter = ","
  ) {}

  @memoize
  private get fieldValues(): Field[] {
    return Object.values(this.fields);
  }

  /**
   * Split the CSV string and look up the relevant field to do the parsing
   */
  extractValues(line: string): FieldValue[] {
    const fieldValues = line.trim().split(this.fieldDelimiter);
    const result: FieldValue[] = [null];

    for (let i = 0; i < fieldValues.length; i++) {
      const field = this.fieldValues.find(f => (f.position + fieldValues.length) % fieldValues.length === i);

      if (field) {
        const value = field.extract(fieldValues[i]);

        result.push(value);
      }
    }

    return result;
  }

}