import {FieldValue} from "../field/Field";
import {FieldMap, Record} from "./Record";

export class MultiFormatRecord implements Record {

  constructor(
    public readonly name: string,
    public readonly key: string[],
    public readonly fields: FieldMap,
    private readonly records: MultiRecordFieldMap,
    private readonly recordIdentifierStart: number,
    private readonly recordIdentifierLength: number,
    public readonly indexes: string[] = []
  ) {}

  /**
   * Extract the relevant part of the line for each field and then get the value from the field
   */
  public extractValues(line: string): FieldValue[] {
    const type = line.substr(this.recordIdentifierStart, this.recordIdentifierLength);
    const record = this.records[type];
    const fields = Object.values(record);
    const values = fields.map(f => f.extract(line.substr(f.position, f.length)));
    const result: FieldValue[] = [null];

    return result.concat(values);
  }

}

export type MultiRecordFieldMap = {
  [recordIdentifier: string]: FieldMap
};
