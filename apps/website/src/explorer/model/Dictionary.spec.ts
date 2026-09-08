import {describe, it, expect} from "vitest";
import {Dictionary} from "./Dictionary.js";

describe("Dictionary", () => {

  it("gives the same index to the same value", () => {
    const dictionary = new Dictionary();

    expect(dictionary.intern("MAN")).to.equal(dictionary.intern("MAN"));
    expect(dictionary.intern("MAN")).to.not.equal(dictionary.intern("LDS"));
  });

  it("reads a value back from its index", () => {
    const dictionary = new Dictionary();
    const index = dictionary.intern("Manchester Piccadilly");

    expect(dictionary.valueOf(index)).to.equal("Manchester Piccadilly");
  });

  it("distinguishes a field the file left empty from one it has no column for", () => {
    const dictionary = new Dictionary();

    // An empty pickup_type means the call can be boarded. A trip.txt with no pickup_type column at
    // all means the same thing by a different route, and a row rendered for a human has to be able
    // to show the difference.
    expect(dictionary.intern("")).to.equal(0);
    expect(dictionary.intern(undefined)).to.equal(-1);
    expect(dictionary.valueOf(0)).to.equal("");
    expect(dictionary.valueOf(-1)).to.equal(undefined);
  });

  it("looks a value up without interning it", () => {
    const dictionary = new Dictionary();

    dictionary.intern("MAN");

    expect(dictionary.lookup("MAN")).to.equal(dictionary.intern("MAN"));
    expect(dictionary.lookup("nothing has ever held this")).to.equal(-1);
    expect(dictionary.size).to.equal(2); // the empty string and MAN, and nothing added by lookup
  });

  it("searches the distinct values rather than the rows", () => {
    const dictionary = new Dictionary();
    const man = dictionary.intern("MAN");
    const mai = dictionary.intern("MAI");
    const lds = dictionary.intern("LDS");

    const mask = dictionary.search(value => value.startsWith("MA"));

    expect(mask[man]).to.equal(1);
    expect(mask[mai]).to.equal(1);
    expect(mask[lds]).to.equal(0);
  });

  it("grows past its initial size", () => {
    const dictionary = new Dictionary();

    for (let i = 0; i < 5000; i++) {
      expect(dictionary.intern(`value ${i}`)).to.equal(i + 1);
    }

    expect(dictionary.size).to.equal(5001);
    expect(dictionary.valueOf(5000)).to.equal("value 4999");
  });

});
