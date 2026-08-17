import {describe, it, expect} from 'vitest';
import {FixedWidthRecord} from "../record/FixedWidthRecord";
import {IntField} from "../field/IntField";
import {DateField} from "../field/DateField";
import {TextField} from "../field/TextField";
import {MultiRecordFile} from "../file/MultiRecordFile";

describe("MultiRecordFile", () => {
  const field = new IntField(1, 3);
  const field2 = new TextField(4, 3);
  const field3 = new DateField(7);

  const record = new FixedWidthRecord(
    "r1test",
    [], {
      "r1field": field,
      "r1field2": field2,
      "r1field3": field3
    });

  const record2 = new FixedWidthRecord(
    "r2test",
    [], {
      "r2field": field,
      "r2field2": field2,
      "r2field3": field3
    });
  
  const file = new MultiRecordFile({
    "1": record,
    "2": record2
  }, 0);

  it("returns all the possible record types", () => {
    expect(file.recordTypes).to.deep.equal([record, record2]);
  });

  it("returns correct record based on the char at a certain position", () => {
    expect(file.getRecord("11012Hi 31122999")).to.deep.equal(record);
    expect(file.getRecord("21012Hi 31122999")).to.deep.equal(record2);
  });

});
