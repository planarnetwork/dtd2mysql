import * as chai from "chai";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {DateField, IntField, TextField} from "../../../src/feed/field";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";

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
        chai.expect(file.recordTypes).to.deep.equal([record]);
    });

    it("always returns the record regardless of the string given", () => {
        chai.expect(file.getRecord("")).to.deep.equal(null);
        chai.expect(file.getRecord("derp")).to.deep.equal(record);
        chai.expect(file.getRecord("123412123")).to.deep.equal(record);
    });

});
