import {describe, it, expect} from 'vitest';
import {TextField} from "../../../src/feed/field/TextField";

describe("TextField", () => {

  it("returns a string value", () => {
    const text = new TextField(0, 3);

    expect(text.extract("Hi")).to.equal("Hi");
  });

});
