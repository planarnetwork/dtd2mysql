import {describe, it, expect} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {commands, feedCursor} from "./container";

/**
 * The CLI's flags, held to the README.
 *
 * `getCommand` answers an unrecognised flag with help and exit 0, which is
 * right for a typo and silent for a dropped entry: a user's cron job would stop
 * importing and report success. Nothing else notices, because the flags are
 * strings and no compiler checks them against the documentation.
 *
 * So this asserts in both directions - every documented flag is implemented,
 * and every implemented flag is documented - which also catches the reverse
 * failure of a command that exists and nobody can find.
 */
const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");

const documented = new Set(
  [...readme.matchAll(/^\s*dtd2mysql (--[a-z0-9-]+)/gm)].map(match => match[1])
);

describe("the CLI flags", () => {

  it("finds flags in the README to check against", () => {
    expect(documented.size).to.be.greaterThan(10);
  });

  it("implements every flag the README documents", () => {
    const missing = [...documented].filter(flag => !commands.hasOwnProperty(flag)).sort();

    expect(missing).to.deep.equal([]);
  });

  it("documents every flag it implements", () => {
    const undocumented = Object.keys(commands).filter(flag => !documented.has(flag)).sort();

    expect(undocumented).to.deep.equal([]);
  });

  it("gives every flag something to build", () => {
    const empty = Object.entries(commands)
      .filter(([, build]) => typeof build !== "function")
      .map(([flag]) => flag);

    expect(empty).to.deep.equal([]);
  });

});

/**
 * Downloading imports nothing, so it has nothing to be behind and needs no
 * database. The log table only says anything where there is one to import into.
 *
 * The nightly feed build is the caller with no database, and it failed here:
 * the cursor was constructed eagerly, so an unset DATABASE_NAME threw before
 * the code that treats a missing log as "take the latest full refresh" could
 * run. Only the pool construction is asserted - reaching for a connection is
 * the failure, whatever a query would have gone on to do.
 */
describe("the feed cursor", () => {

  it("needs no database, because downloading does not import", async () => {
    const before = process.env.DATABASE_NAME;
    delete process.env.DATABASE_NAME;

    try {
      await expect(feedCursor().getLastProcessedFile()).resolves.to.equal(undefined);
    }
    finally {
      if (before !== undefined) {
        process.env.DATABASE_NAME = before;
      }
    }
  });

});
