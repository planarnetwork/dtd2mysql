import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as zlib from "node:zlib";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {frontCode} from "raptor-journey-planner";
import {readPatternFile, writePatternFile} from "../src/merge/patternFile.js";

let workDir: string;

beforeEach(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pattern-file-"));
});

afterEach(async () => {
  await fs.promises.rm(workDir, {recursive: true, force: true});
});

async function* from(patterns: string[][]): AsyncGenerator<string[]> {
  for (const pattern of patterns) {
    yield pattern;
  }
}

/**
 * A three character code, so a line can be cut back up into stations.
 */
function code(n: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const at = Math.abs(n) % (26 * 26 * 26);

  return letters[Math.floor(at / 676) % 26] + letters[Math.floor(at / 26) % 26] + letters[at % 26];
}

/**
 * Sorted and duplicate free, because that is what both the writer and raptor's own merge are given.
 *
 * Lengths run from two stations to fourteen, which is the longest a national feed produced and the
 * reason the shared count is a character counting up rather than a digit.
 */
function patterns(count: number): string[][] {
  const made: string[][] = [];

  for (let i = 0; i < count; i++) {
    const pattern = [code(i * 31)];

    for (let station = 1; station < 2 + (i % 13); station++) {
      pattern.push(code(i * 31 + station * 977));
    }

    made.push(pattern);
  }

  return [...new Set(made.map(pattern => pattern.join("")))]
    .sort()
    .map(line => line.match(/.{3}/g) as string[]);
}

describe("writePatternFile", () => {
  it("round trips through readPatternFile", async () => {
    const written = patterns(500);
    const file = path.join(workDir, "patterns.br");
    const result = await writePatternFile(from(written), file);

    expect(result.patterns).to.equal(written.length);

    const read: string[][] = [];

    for await (const pattern of readPatternFile(file)) {
      read.push(pattern);
    }

    expect(read).to.deep.equal(written);
  });

  it("codes a chunk boundary exactly as a single pass would", async () => {
    // More than the 10,000 lines a chunk holds, so the seam is exercised. A chunk coded without
    // its predecessor would write the first line of every chunk out in full: still readable, but
    // no longer the bytes raptor's own merge produces, and the whole point of chunking is that it
    // makes no difference.
    const written = patterns(25_000);

    expect(written.length).to.be.greaterThan(10_000);

    const file = path.join(workDir, "patterns.br");

    await writePatternFile(from(written), file);

    const coded = zlib.brotliDecompressSync(await fs.promises.readFile(file))
      .toString("utf8")
      .split("\n")
      .filter(line => line !== "");

    expect(coded).to.deep.equal([...frontCode(written.map(pattern => pattern.join("")))]);
  });

  it("writes an empty file for no patterns", async () => {
    const file = path.join(workDir, "patterns.br");
    const result = await writePatternFile(from([]), file);

    expect(result.patterns).to.equal(0);

    const read: string[][] = [];

    for await (const pattern of readPatternFile(file)) {
      read.push(pattern);
    }

    expect(read).to.deep.equal([]);
  });
});
