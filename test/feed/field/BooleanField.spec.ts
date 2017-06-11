import * as chai from "chai";
import {BooleanField} from "../../../src/feed/field/BooleanField";

describe("BooleanField", () => {

  it("converts a string to an integer (1 or 0)", () => {
    const field = new BooleanField(0);

    chai.expect(field.extract("1")).to.equal(1);
    chai.expect(field.extract("Y")).to.equal(1);
    chai.expect(field.extract("0")).to.equal(0);
    chai.expect(field.extract("N")).to.equal(0);
  });

  it("throws an error when given invalid data", () => {
    const field = new BooleanField(0);

    chai.expect(() => field.extract("5")).to.throw('Unable to interpret "5" as boolean');
  });

});
