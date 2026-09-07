import {describe, it, expect} from "vitest";
import { Sequence } from "./Sequence";

describe("Sequence", () => {

  it("returns a new ID on every call", () => {
    const sequence = new Sequence();
    const id1 = sequence.next();
    const id2 = sequence.next();

    expect(id1).to.equal(1);
    expect(id2).to.equal(2);
  });

  it("starts from a given number", () => {
    const sequence = new Sequence(100);
    const id1 = sequence.next();
    const id2 = sequence.next();

    expect(id1).to.equal(100);
    expect(id2).to.equal(101);
  });

});
