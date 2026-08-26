import {describe, it, expect, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {faresRefresh, parseGroups} from "./FaresSource";

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

// Taken from RJFAF847.LOC. The trailing spaces are the fixed widths, and are
// part of what is being tested.
const LONDON_TERMINALS = "RG7010720311229991508202407042017LONDON TERMINALS     ";
const BEDFORD_BUS = "RG70J2230311229992506201907042017BEDFORD+BUS          ";
const EUSTON = "RM7010720311229997014440EUS";
const MARYLEBONE = "RM7010720311229997014750MYB";
const A_LOCATION = "RL7000010311229991508202410102022  0001AACHEN          ";

describe("parseGroups", () => {

  it("reads a group", () => {
    expect(parseGroups([LONDON_TERMINALS]).groups).to.deep.equal([{
      uic: "7010720",
      description: "LONDON TERMINALS",
      startDate: "2024-08-15",
      endDate: "2999-12-31"
    }]);
  });

  it("reads a member", () => {
    expect(parseGroups([EUSTON]).members).to.deep.equal([{
      groupUic: "7010720",
      endDate: "2999-12-31",
      crs: "EUS"
    }]);
  });

  // The description is a 16 character field and the value is padded into it.
  // area_name is published, so the padding would be too.
  it("takes the fixed width padding off a name", () => {
    expect(parseGroups([BEDFORD_BUS]).groups[0].description).to.equal("BEDFORD+BUS");
  });

  // The LOC file is 207,000 lines and 2,200 of them are these.
  it("ignores the rest of the file", () => {
    const parsed = parseGroups([A_LOCATION, LONDON_TERMINALS, EUSTON, MARYLEBONE]);

    expect(parsed.groups).to.have.length(1);
    expect(parsed.members.map(m => m.crs)).to.deep.equal(["EUS", "MYB"]);
  });

  it("survives a line it cannot identify at all", () => {
    expect(parseGroups(["", "XX", LONDON_TERMINALS]).groups).to.have.length(1);
  });

});
