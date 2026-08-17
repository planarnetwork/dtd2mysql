
import {MultiFormatRecord} from '../record/MultiFormatRecord';
import {Field} from "./Field";
import {RecordWithManualIdentifier} from "../record/FixedWidthRecord";

export class ForeignKeyField extends Field {

  constructor(private readonly foreignRecord: RecordWithManualIdentifier | MultiFormatRecord, public readonly offset = 0) {
    super(0, 1, false, []);
  }

  /**
   * Return the last apply ID of the foreign record
   */
  protected parse(value: string): number {
    return this.foreignRecord.lastId + this.offset;
  }

}
