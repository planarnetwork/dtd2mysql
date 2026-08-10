import * as chai from "chai";
import {describe, it, expect} from 'vitest';
import {ForeignKeyField} from "../../src/field/ForeignKeyField";
import {RecordWithManualIdentifier} from "../../src/record/FixedWidthRecord";

describe("ForeignKeyField", () => {

  it("returns the id of the linked record", () => {
    const record = new RecordWithManualIdentifier("test", [], {});
    const field = new ForeignKeyField(record);

    record.extractValues("");
    expect(field.extract("goldfish")).to.equal(1);
    expect(field.extract("goldfish")).to.equal(1);

    record.extractValues("");
    expect(field.extract("goldfish")).to.equal(2);
  });

});
