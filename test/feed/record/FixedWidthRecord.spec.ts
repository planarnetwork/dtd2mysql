
import * as chai from "chai";
import {IntField} from "../../../src/feed/field/IntField";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";

describe("FixedWidthRecord", () => {

  it("looks up the correct field", () => {
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

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal([null, 1012, "Hi ", "2999-12-31"]);
  });

  it("ignores missing fields", () => {
    const field = new IntField(0, 4);
    const field2 = new TextField(4, 3);

    const record = new FixedWidthRecord(
      "test",
      [], {
        "field": field,
        "field2": field2,
      });

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal([null, 1012, "Hi "]);
  });


});
