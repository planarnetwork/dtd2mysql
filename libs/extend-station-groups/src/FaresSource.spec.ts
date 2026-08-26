import {describe, it, expect, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {faresRefresh} from "./FaresSource";

let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "fares"));
});

afterEach(() => {
  fs.rmSync(directory, {recursive: true, force: true});
});

const give = (name: string) => fs.writeFileSync(path.join(directory, name), "");

describe("faresRefresh", () => {

  it("takes a refresh named directly", () => {
    give("RJFAF847.ZIP");

    const file = path.join(directory, "RJFAF847.ZIP");

    expect(faresRefresh(file)).to.equal(file);
  });

  it("finds the refresh in a directory", () => {
    give("RJFAF847.ZIP");

    expect(faresRefresh(directory)).to.equal(path.join(directory, "RJFAF847.ZIP"));
  });

  // A directory feeds are downloaded into accumulates more than one cycle, and
  // the newest is the one to build from.
  it("takes the highest numbered refresh when a directory holds several", () => {
    give("RJFAF845.ZIP");
    give("RJFAF847.ZIP");
    give("RJFAF846.ZIP");

    expect(faresRefresh(directory)).to.equal(path.join(directory, "RJFAF847.ZIP"));
  });

  // Sorted numerically, not as text: 847 is after 99 and "847" < "99".
  it("compares the sequence as a number", () => {
    give("RJFAF99.ZIP");
    give("RJFAF847.ZIP");

    expect(faresRefresh(directory)).to.equal(path.join(directory, "RJFAF847.ZIP"));
  });

  it("ignores the timetable feed sitting beside it", () => {
    give("RJTTF918.ZIP");
    give("RJFAF847.ZIP");

    expect(faresRefresh(directory)).to.equal(path.join(directory, "RJFAF847.ZIP"));
  });

  // A change file amends a refresh that has already been read. Applying one to
  // nothing produces a set of groups missing everything the refresh
  // established, which looks like a build rather than an error.
  it("refuses a change file, which cannot stand in for a refresh", () => {
    give("RJFAC848.ZIP");

    expect(() => faresRefresh(path.join(directory, "RJFAC848.ZIP")))
      .to.throw(/is not a fares refresh. Expected a file named RJFAFxxx.ZIP/);
  });

  it("says so when a directory holds no refresh", () => {
    give("RJTTF918.ZIP");

    expect(() => faresRefresh(directory)).to.throw(/No fares refresh in .* Expected a file named RJFAFxxx.ZIP./);
  });

  it("says so when the path does not exist", () => {
    expect(() => faresRefresh(path.join(directory, "nothing")))
      .to.throw(/No fares feed at /);
  });

});
