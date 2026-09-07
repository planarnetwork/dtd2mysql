import {describe, it, expect, afterEach} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {deliverFeed, workingDirectory} from "./DeliverFeed";

const made: string[] = [];

function scratch(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deliver"));

  made.push(dir);

  return dir;
}

function feed(into: string): string {
  fs.mkdirSync(into, {recursive: true});
  fs.writeFileSync(path.join(into, "agency.txt"), "agency_id\nOP1\n");

  return into;
}

afterEach(() => {
  for (const dir of made.splice(0)) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

describe("workingDirectory", () => {

  it("is a sibling of the output", () => {
    // The whole point: /tmp is very often a different device from the disk the
    // work is on, and rename cannot cross one.
    const work = workingDirectory("/some/where/gtfs");

    expect(path.dirname(work)).to.equal("/some/where");
  });

  it("is hidden and named after the output, so a stray one says what it was", () => {
    expect(path.basename(workingDirectory("/some/where/gtfs")))
      .to.match(/^\.gtfs\.building-\d+$/);
  });

});

describe("deliverFeed", () => {

  it("puts the feed at the output", async () => {
    const dir = scratch();
    const output = path.join(dir, "out");

    await deliverFeed(feed(path.join(dir, "work")), output);

    expect(fs.readFileSync(path.join(output, "agency.txt"), "utf8")).to.equal("agency_id\nOP1\n");
  });

  it("replaces an existing output", async () => {
    const dir = scratch();
    const output = path.join(dir, "out");

    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "stale.txt"), "old");

    await deliverFeed(feed(path.join(dir, "work")), output);

    expect(fs.readdirSync(output)).to.deep.equal(["agency.txt"]);
  });

  it("crosses a filesystem rather than failing", async () => {
    // The bug this exists for: building in /tmp and renaming onto another device
    // threw EXDEV. It had already removed the output by then, so the caller was
    // left with neither their directory nor a feed.
    const dir = scratch();
    const output = path.join(dir, "out");
    const work = feed(fs.mkdtempSync(path.join(os.tmpdir(), "elsewhere")));

    await deliverFeed(work, output);

    expect(fs.existsSync(path.join(output, "agency.txt"))).to.equal(true);
    expect(fs.existsSync(work)).to.equal(false);
  });

  it("leaves the old output alone when the feed cannot be delivered", async () => {
    const dir = scratch();
    const output = path.join(dir, "out");

    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "important.txt"), "user data");

    // Nothing was built, so there is nothing to put there.
    await expect(deliverFeed(path.join(dir, "never-built"), output)).rejects.toThrow();

    expect(fs.readFileSync(path.join(output, "important.txt"), "utf8")).to.equal("user data");
  });

  it("writes a zip when the output is one, and cleans up after itself", async () => {
    const dir = scratch();
    const output = path.join(dir, "feed.zip");
    const work = feed(path.join(dir, "work"));

    await deliverFeed(work, output);

    expect(fs.statSync(output).size).to.be.greaterThan(0);
    expect(fs.existsSync(work)).to.equal(false);
  });

});
