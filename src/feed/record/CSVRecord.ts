
import {Field, FieldValue} from "../field/Field";
import {FieldMap, ParsedRecord, Record, RecordAction} from "./Record";
import * as memoize from "memoized-class-decorator";

export class CSVRecord implements Record {

  constructor(
    public readonly name: string,
    public readonly key: string[],
    public readonly fields: FieldMap,
    public readonly indexes: string[] = [],
    public readonly fieldDelimiter: string | RegExp = ",",
    public readonly orderedInserts: boolean = false
  ) {}

  @memoize
  private get fieldValues(): [string, Field][] {
    return Object.entries(this.fields);
  }

  /**
   * Split the CSV string and look up the relevant field to do the parsing
   */
  extractValues(line: string): ParsedRecord {
    const fieldValues = line.trim().split(this.fieldDelimiter);
    const values = { id: null };
    const action = RecordAction.Insert;

    for (let i = 0; i < fieldValues.length; i++) {
      const entry = this.fieldValues.find(([k, f]) => (f.position + fieldValues.length) % fieldValues.length === i);

      if (entry) {
        const [key, field] = entry;

        values[key] = field.extract(fieldValues[i]);
      }
    }

    return { action, values };
  }

}
