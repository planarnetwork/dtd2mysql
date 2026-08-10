import {describe, it, expect, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {timetableFeeds} from "./FeedFiles";

let directory: string;

const give = (...names: string[]) => {
  for (const name of names) {
    fs.writeFileSync(path.join(directory, name), "");
  }

  return directory;
};

const names = (paths: string[]) => paths.map(p => path.basename(p));

beforeEach(() => directory = fs.mkdtempSync(path.join(os.tmpdir(), "feeds")));
afterEach(() => fs.rmSync(directory, {recursive: true, force: true}));

describe("timetableFeeds", () => {

  it("takes a file as given", () => {
    give("RJTTF918.ZIP");

    expect(names(timetableFeeds([path.join(directory, "RJTTF918.ZIP")]))).to.deep.equal(["RJTTF918.ZIP"]);
  });

  it("puts the refresh before its incrementals, which sorting by name does not", () => {
    // As text, RJTTC919 sorts before RJTTF918
    const dir = give("RJTTC920.ZIP", "RJTTF918.ZIP", "RJTTC919.ZIP");

    expect(names(timetableFeeds([dir]))).to.deep.equal(["RJTTF918.ZIP", "RJTTC919.ZIP", "RJTTC920.ZIP"]);
  });

  it("ignores the other feeds that live in the same directory", () => {
    const dir = give("RJTTF918.ZIP", "RJFAF847.ZIP", "RJFAC848.ZIP", "RJRG1057.ZIP", "nfm64.zip");

    expect(names(timetableFeeds([dir]))).to.deep.equal(["RJTTF918.ZIP"]);
  });

  it("ignores anything that is not a feed", () => {
    const dir = give("RJTTF918.ZIP", "RJTTF918.MCA", "notes.txt", "RJTT.ZIP", "RJTTX918.ZIP");

    expect(names(timetableFeeds([dir]))).to.deep.equal(["RJTTF918.ZIP"]);
  });

  it("accepts a lower case extension", () => {
    const dir = give("rjttf918.zip");

    expect(names(timetableFeeds([dir]))).to.deep.equal(["rjttf918.zip"]);
  });

  it("starts at the most recent refresh, because an earlier cycle is superseded", () => {
    const dir = give(
      "RJTTF918.ZIP", "RJTTC919.ZIP", "RJTTC920.ZIP",
      "RJTTF925.ZIP", "RJTTC926.ZIP"
    );

    expect(names(timetableFeeds([dir]))).to.deep.equal(["RJTTF925.ZIP", "RJTTC926.ZIP"]);
  });

  it("takes every incremental when the directory holds no refresh", () => {
    const dir = give("RJTTC919.ZIP", "RJTTC920.ZIP");

    expect(names(timetableFeeds([dir]))).to.deep.equal(["RJTTC919.ZIP", "RJTTC920.ZIP"]);
  });

  it("orders by the sequence number rather than by its digits", () => {
    const dir = give("RJTTF998.ZIP", "RJTTC999.ZIP", "RJTTC1000.ZIP", "RJTTC1001.ZIP");

    expect(names(timetableFeeds([dir])))
      .to.deep.equal(["RJTTF998.ZIP", "RJTTC999.ZIP", "RJTTC1000.ZIP", "RJTTC1001.ZIP"]);
  });

  it("keeps the sources in the order they were given", () => {
    const dir = give("RJTTF918.ZIP", "RJTTC919.ZIP");

    expect(names(timetableFeeds([path.join(dir, "RJTTC919.ZIP"), dir])))
      .to.deep.equal(["RJTTC919.ZIP", "RJTTF918.ZIP", "RJTTC919.ZIP"]);
  });

  it("is empty when the directory holds no feed at all", () => {
    expect(timetableFeeds([give("notes.txt")])).to.deep.equal([]);
  });

  it("says which source does not exist", () => {
    expect(() => timetableFeeds([path.join(directory, "nope.zip")])).to.throw(/nope\.zip does not exist/);
  });

});
