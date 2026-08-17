import {describe, it, expect} from 'vitest';
import {FixedWidthRecord} from "../record/FixedWidthRecord";
import {IntField} from "../field/IntField";
import {DateField} from "../field/DateField";
import {TextField} from "../field/TextField";
import {SingleRecordFile} from "../file/SingleRecordFile";

describe("SingleRecordFile", () => {
  const field = new IntField(0, 4);
  const field2 = new TextField(4, 3);
  const field3 = new DateField(7);

  const record = new FixedWidthRecord(
    "test",
    [], {
      "field": field,
      "field2": field2,
      "field3": field3
    });

  const file = new SingleRecordFile(record);

  it("wraps the record in an array", () => {
    expect(file.recordTypes).to.deep.equal([record]);
  });

  it("always returns the record regardless of the string given", () => {
    expect(file.getRecord("")).to.deep.equal(record);
    expect(file.getRecord("derp")).to.deep.equal(record);
    expect(file.getRecord("123412123")).to.deep.equal(record);
  });

});
