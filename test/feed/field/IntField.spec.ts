import * as chai from "chai";
import {IntField} from "../../../src/feed/field/IntField";

describe("IntField", () => {

  it("formats an integer", () => {
    const field = new IntField(0, 3);

    chai.expect(field.extract("123")).to.equal(123);
  });

  it("adds predefined nullable characters", () => {
    const field = new IntField(0, 3, true);

    chai.expect(field.extract("999")).to.equal(null);
  });

  it("throws an error when given invalid data", () => {
    const field = new IntField(0, 4, true);

    chai.expect(() => field.extract("_9_9")).to.throw('Error parsing int: "_9_9" isNaN');
  });

});
