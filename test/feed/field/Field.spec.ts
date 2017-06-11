import * as chai from "chai";
import {TextField} from "../../../src/feed/field/TextField";

describe("Field", () => {

  it("return null if the field is nullable", () => {
    const nullable = new TextField(0, 3, true);

    chai.expect(nullable.extract("  ")).to.equal("  ");
    chai.expect(nullable.extract("   ")).to.equal(null);
    chai.expect(nullable.extract("")).to.equal(null);
  });

  it("throw an exception if it is not", () => {
    const notNullable = new TextField(0, 3, false);

    chai.expect(notNullable.extract("  ")).to.equal("  ");
    chai.expect(() => notNullable.extract("   ")).to.throw('Non-nullable field received null value: "   "');
    chai.expect(() => notNullable.extract("")).to.throw('Non-nullable field received null value: ""');
  });

});
