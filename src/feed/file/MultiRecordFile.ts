
import {Record} from "../record/Record";
import {FeedFile} from "./FeedFile";

export class MultiRecordFile implements FeedFile {

  constructor(
    public readonly records: RecordTypeMap,
    public readonly typeStart: number = 1,
    public readonly typeLength: number = 1
  ) { }

  /**
   * Return all possible record types
   */
  get recordTypes(): Record[] {
    return Object.values(this.records);
  }

  /**
   * Look at the characters in the given line to determine which record type is relevant
   */
  public getRecord(line: string): Record {
    return this.records[line.substr(this.typeStart, this.typeLength)];
  }
}

export type RecordTypeMap = {
  [recordIdentifier: string]: Record
};