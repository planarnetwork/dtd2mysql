
import * as chai from "chai";
import {DoubleField} from "../../../src/feed/field/DoubleField";
import {ForeignKeyField} from "../../../src/feed/field/ForeignKeyField";
import {RecordWithManualIdentifier} from "../../../src/feed/record/FixedWidthRecord";

describe("ForeignKeyField", () => {

  it("returns the id of the linked record", () => {
    const record = new RecordWithManualIdentifier("test", [], {});
    const field = new ForeignKeyField(record);

    record.extractValues("");
    chai.expect(field.extract("goldfish")).to.equal(1);
    chai.expect(field.extract("goldfish")).to.equal(1);

    record.extractValues("");
    chai.expect(field.extract("goldfish")).to.equal(2);
  });

});
