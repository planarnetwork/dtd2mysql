
import {Field} from "./Field";
import {RecordWithManualIdentifier} from "../record/FixedWidthRecord";

export class ForeignKeyField extends Field {

  constructor(private readonly foreignRecord: RecordWithManualIdentifier) {
    super(0, 1, false, []);
  }

  /**
   * Return the last insert ID of the foreign record
   */
  protected parse(value: string): number {
    return this.foreignRecord.lastId;
  }

}
