import * as chai from "chai";
import {DateField} from "../../../src/feed/field/DateField";

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
