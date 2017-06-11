
import {FeedFile} from "./FeedFile";
import {Record} from "../record/Record";

export class SingleRecordFile implements FeedFile {

  constructor(
    private readonly recordType: Record
  ) {}

  /**
   * Return the record type wrapped in an array
   */
  public get recordTypes(): Record[] {
    return [this.recordType];
  }

  /**
   * Return the record type
   */
  public getRecord(line: string): Record {
    return this.recordType;
  }
}