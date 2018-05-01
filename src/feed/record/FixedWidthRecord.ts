
import {FieldMap, ParsedRecord, Record, RecordAction} from "./Record";

const actionMap = {
  "I": RecordAction.Insert,
  "A": RecordAction.Update,
  "D": RecordAction.Delete,
  "R": RecordAction.Insert
};

/**
 * Record with fixed with fields
 */
export class FixedWidthRecord implements Record {

  constructor(
    public readonly name: string,
    public readonly key: string[],
    public readonly fields: FieldMap,
    public readonly indexes: string[] = [],
    public readonly hasUpdateMarker: boolean = false
  ) {}

  /**
   * Extract the relevant part of the line for each field and then get the value from the field
   */
  public extractValues(line: string): ParsedRecord {
    const action = this.hasUpdateMarker ? actionMap[line.charAt(0)] : RecordAction.Insert;
    const values = action === RecordAction.Delete ? {} : { id: null };
    const fields = action === RecordAction.Delete ? this.key : Object.keys(this.fields);

    for (const key of fields) {
      values[key] = this.fields[key].extract(line.substr(this.fields[key].position, this.fields[key].length));
    }

    return { action, values } as ParsedRecord;
  }

}

/**
 * This record type uses a generated integer rather than the standard auto_increment. The only reason to do this use
 * this record type is to reference a row in another table that has not been inserted yet see {@link ForeignKeyField}
 */
export class RecordWithManualIdentifier extends FixedWidthRecord {
  public lastId: number = 0;

  public extractValues(line: string): ParsedRecord {
    const values = { id: ++this.lastId };
    const action = RecordAction.Insert;

    for (const key in this.fields) {
      values[key] = this.fields[key].extract(line.substr(this.fields[key].position, this.fields[key].length));
    }

    return { action, values };
  }

}
