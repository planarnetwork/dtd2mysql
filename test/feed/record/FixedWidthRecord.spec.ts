
import * as chai from "chai";
import {IntField} from "../../../src/feed/field/IntField";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {FixedWidthRecord, RecordWithManualIdentifier} from "../../../src/feed/record/FixedWidthRecord";
import {RecordAction} from "../../../src/feed/record/Record";

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

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Insert,
      values: {
        id: null,
        field: 1012,
        field2: "Hi ",
        field3: "2999-12-31"
      }
    });
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

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Insert,
      values: {
        id: null,
        field: 1012,
        field2: "Hi "
      }
    });
  });

  it("picks the correct action", () => {
    const field = new IntField(1, 4);
    const field2 = new TextField(5, 3);
    const field3 = new DateField(8);

    const record = new FixedWidthRecord(
      "test",
      ["field", "field2"],
      {
        "field": field,
        "field2": field2,
        "field3": field3
      },
      [],
      {
        "I": RecordAction.Insert,
        "A": RecordAction.Update,
        "D": RecordAction.Delete,
        "R": RecordAction.Insert
      }
    );

    chai.expect(record.extractValues("D1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Delete,
      values: {
        field: 1012,
        field2: "Hi "
      }
    });

    chai.expect(record.extractValues("A1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Update,
      values: {
        id: null,
        field: 1012,
        field2: "Hi ",
        field3: "2999-12-31"
      }
    });
  });
});

describe("RecordWithManualIdentifier", () => {

  it("populates the id field", () => {
    const field = new IntField(0, 4);
    const field2 = new TextField(4, 3);
    const field3 = new DateField(7);

    const record = new RecordWithManualIdentifier(
      "test",
      [], {
        "field": field,
        "field2": field2,
        "field3": field3
      });

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Insert,
      values: {
        id: 1,
        field: 1012,
        field2: "Hi ",
        field3: "2999-12-31"
      }
    });
  });

  it("increments the id field", () => {
    const field = new IntField(0, 4);
    const field2 = new TextField(4, 3);

    const record = new RecordWithManualIdentifier(
      "test",
      [], {
        "field": field,
        "field2": field2,
      });

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Insert,
      values: {
        id: 1,
        field: 1012,
        field2: "Hi "
      }
    });

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Insert,
      values: {
        id: 2,
        field: 1012,
        field2: "Hi "
      }
    });

    chai.expect(record.extractValues("1012Hi 31122999")).to.deep.equal({
      action: RecordAction.Insert,
      values: {
        id: 3,
        field: 1012,
        field2: "Hi "
      }
    });
  });

});

