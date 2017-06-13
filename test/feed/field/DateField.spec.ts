import * as chai from "chai";
import {DateField, ShortDateField} from "../../../src/feed/field/DateField";

describe("DateField", () => {

  it("formats a DTD date", () => {
    const field = new DateField(0);

    chai.expect(field.extract("31122999")).to.equal("2999-12-31");
  });

  it("adds predefined nullable characters", () => {
    const field = new DateField(0, true);

    chai.expect(field.extract("00000000")).to.equal(null);
  });

});

describe("ShortDateField", () => {

  it("formats a short date", () => {
    const field = new ShortDateField(0);

    chai.expect(field.extract("170531")).to.equal("2017-05-31");
    chai.expect(field.extract("999999")).to.equal("2099-12-31");
  });

  it("adds predefined nullable characters", () => {
    const field = new ShortDateField(0, true);

    chai.expect(field.extract("000000")).to.equal(null);
  });

});
