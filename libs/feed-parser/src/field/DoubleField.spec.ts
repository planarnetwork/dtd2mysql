import {describe, it, expect} from 'vitest';
import {DoubleField} from "../field/DoubleField";

describe("DoubleField", () => {

  it("formats an integer", () => {
    const field = new DoubleField(0, 4, 2);

    expect(field.extract("12.30")).to.equal(12.3);
  });

  it("adds predefined nullable characters", () => {
    const field = new DoubleField(0, 3, 2, true);

    expect(field.extract("999")).to.equal(null);
  });

  it("throws an error when given invalid data", () => {
    const field = new DoubleField(0, 3, 2, true);

    expect(() => field.extract("fail")).to.throw('Error parsing float: "fail"');
  });


});
