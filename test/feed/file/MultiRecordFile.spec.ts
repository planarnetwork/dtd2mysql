
import * as chai from "chai";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {IntField} from "../../../src/feed/field/IntField";
import {DateField} from "../../../src/feed/field/DateField";
import {TextField} from "../../../src/feed/field/TextField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";

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
    chai.expect(file.recordTypes).to.deep.equal([record, record2]);
  });

  it("returns correct record based on the char at a certain position", () => {
    chai.expect(file.getRecord("11012Hi 31122999")).to.deep.equal(record);
    chai.expect(file.getRecord("21012Hi 31122999")).to.deep.equal(record2);
  });

});
