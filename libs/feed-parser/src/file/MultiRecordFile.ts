
import {Record} from "../record/Record";
import {FeedFile, RecordFilter} from "./FeedFile";

export class MultiRecordFile implements FeedFile {

  constructor(
    public readonly records: RecordTypeMap,
    public readonly typeStart: number = 1,
    public readonly typeLength: number = 1,
    private readonly filter: RecordFilter | null = null
  ) { }

  /**
   * Return all possible record types
   */
  get recordTypes(): Record[] {
    return Object.values(this.records);
  }

  /**
   * Look at the characters in the given line to determine which record type is
   * relevant, unless the file says the line is not a record at all.
   */
  public getRecord(line: string): Record | null {
    if (this.filter !== null && !this.filter(line)) {
      return null;
    }

    return this.records[line.substr(this.typeStart, this.typeLength)];
  }
}

export type RecordTypeMap = {
  [recordIdentifier: string]: Record
};