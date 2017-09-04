import * as chai from "chai";
import {TimeField} from "../../../src/feed/field/TimeField";

describe("TimeField", () => {

  it("formats the time", () => {
    const field = new TimeField(0, 5);

    chai.expect(field.extract("1230 ")).to.equal("12:30:00");
  });

  it("adds half seconds", () => {
    const field = new TimeField(0, 5);

    chai.expect(field.extract("1230H")).to.equal("12:30:30");
    chai.expect(field.extract("1230 ")).to.equal("12:30:00");
  });

  it("detects null", () => {
    const field = new TimeField(0, 5);

    chai.expect(field.extract("     ")).to.equal(null);
  });

  it("formats the public time", () => {
    const field = new TimeField(0, 4);

    chai.expect(field.extract("1230")).to.equal("12:30:00");
  });

  it("detects null in public times", () => {
    const field = new TimeField(0, 4);

    chai.expect(field.extract("0000")).to.equal(null);
  });

});
