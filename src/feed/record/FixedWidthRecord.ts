
import {FieldMap, ParsedRecord, Record, RecordAction} from "./Record";

/**
 * Record with fixed with fields
 */
export class FixedWidthRecord implements Record {

  constructor(
    public readonly name: string,
    public readonly key: string[],
    public readonly fields: FieldMap,
    public readonly indexes: string[] = [],
    public readonly actionMap: ActionMap = {},
    public readonly charPosition: number = 0
  ) {}

  /**
   * Extract the relevant part of the line for each field and then get the value from the field
   */
  public extractValues(line: string): ParsedRecord {
    const action = this.actionMap[line.charAt(this.charPosition)] || RecordAction.Insert;
    const values = action === RecordAction.Delete ? {} : { id: null };
    const fields = action === RecordAction.Delete ? this.key : Object.keys(this.fields);

    for (const key of fields) {
      values[key] = this.fields[key].extract(line.substr(this.fields[key].position, this.fields[key].length));
    }

    return { action, values } as ParsedRecord;
  }

}

/**
 * Different feeds use different characters for different actions, this map provides a look up from char to action
 */
export interface ActionMap {
  [char: string]: RecordAction;
}

/**
 * This record type uses a generated integer rather than the standard auto_increment. The only reason to do this use
 * this record type is to reference a row in another table that has not been inserted yet see {@link ForeignKeyField}
 */
export class RecordWithManualIdentifier extends FixedWidthRecord {
  public lastId: number = 0;

  public extractValues(line: string): ParsedRecord {
    const action = this.actionMap[line.charAt(this.charPosition)] || RecordAction.Insert;
    const values = action === RecordAction.Delete ? {} : { id: ++this.lastId };

    for (const key in this.fields) {
      values[key] = this.fields[key].extract(line.substr(this.fields[key].position, this.fields[key].length));
    }

    return { action, values } as ParsedRecord;
  }

}
