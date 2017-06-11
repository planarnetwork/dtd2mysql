
import * as chai from "chai";
import {DoubleField} from "../../../src/feed/field/DoubleField";

describe("DoubleField", () => {

  it("formats an integer", () => {
    const field = new DoubleField(0, 4, 2);

    chai.expect(field.extract("12.30")).to.equal(12.3);
  });

  it("adds predefined nullable characters", () => {
    const field = new DoubleField(0, 3, 2, true);

    chai.expect(field.extract("999")).to.equal(null);
  });

  it("throws an error when given invalid data", () => {
    const field = new DoubleField(0, 3, 2, true);

    chai.expect(() => field.extract("fail")).to.throw('Error parsing float: "fail"');
  });


});
