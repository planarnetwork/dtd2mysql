import * as chai from "chai";
import { MemoizedSequence } from "./MemoizedSequence";

describe("MemoizedSequence", () => {

  it("returns a new ID for every new hash", () => {
    const sequence = new MemoizedSequence();
    const hash1 = sequence.get("a");
    const hash2 = sequence.get("b");

    chai.expect(hash1).to.not.equal(hash2);
  });

  it("returns the same ID for the same hash", () => {
    const sequence = new MemoizedSequence();
    const hash1 = sequence.get("a");
    const hash2 = sequence.get("a");

    chai.expect(hash1).to.equal(hash2);
  });

  it("lets you peek at the hashes", () => {
    const sequence = new MemoizedSequence();
    sequence.get("a");

    const seenA = sequence.haveSeen("a");
    const seenB = sequence.haveSeen("b");

    chai.expect(seenA).to.equal(true);
    chai.expect(seenB).to.equal(false);
  });

});
