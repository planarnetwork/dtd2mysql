import * as chai from "chai";
import {describe, it, expect} from 'vitest';
import {DateField, ShortDateField} from "../../src/field/DateField";

describe("DateField", () => {

  it("formats a DTD date", () => {
    const field = new DateField(0);

    expect(field.extract("31122999")).to.equal("2999-12-31");
  });

  it("adds predefined nullable characters", () => {
    const field = new DateField(0, true);

    expect(field.extract("00000000")).to.equal(null);
  });

});

describe("ShortDateField", () => {

  it("formats a short date", () => {
    const field = new ShortDateField(0);

    expect(field.extract("170531")).to.equal("2017-05-31");
    expect(field.extract("999999")).to.equal("2099-12-31");
  });

  it("adds predefined nullable characters", () => {
    const field = new ShortDateField(0, true);

    expect(field.extract("000000")).to.equal(null);
  });

});
