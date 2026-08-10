import * as chai from "chai";
import {describe, it, expect} from 'vitest';
import {TextField} from "../../src/field/TextField";

describe("Field", () => {

  it("return null if the field is nullable", () => {
    const nullable = new TextField(0, 3, true);

    expect(nullable.extract("  ")).to.equal("  ");
    expect(nullable.extract("   ")).to.equal(null);
    expect(nullable.extract("")).to.equal(null);
  });

  it("throw an exception if it is not", () => {
    const notNullable = new TextField(0, 3, false);

    expect(notNullable.extract("  ")).to.equal("  ");
    expect(() => notNullable.extract("   ")).to.throw('Non-nullable field received null value: "   "');
    expect(() => notNullable.extract("")).to.throw('Non-nullable field received null value: ""');
  });

});
