import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {zipSync, strToU8} from "fflate";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import * as readline from "node:readline";
import * as zlib from "node:zlib";
import {Readable} from "node:stream";
import {PatternLoader, PatternReader, StopTable, loadGtfs} from "transfer-pattern-planner";
import {DirectoryPatternProvider} from "transfer-pattern-planner/node";
import {readPatternFile} from "../src/merge/patternFile.js";

const run = promisify(execFile);

/**
 * The whole thing, end to end, over `fixtures/tiny`.
 *
 * Through the CLI as a subprocess rather than through the api: a worker is given a file to run, so
 * the pool only works if that file is where it is looked for, which the api called from vitest
 * would not show.
 */
const cli = path.join(import.meta.dirname, "..", "src", "index.ts");
const fixture = path.join(import.meta.dirname, "..", "fixtures", "tiny");

let workDir: string;
let feed: string;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "transfer-patterns-test-"));
  feed = path.join(workDir, "gtfs.zip");

  const entries = Object.fromEntries(
    fs.readdirSync(fixture)
      .filter(file => file.endsWith(".txt"))
      .map(file => [file, strToU8(fs.readFileSync(path.join(fixture, file), "utf8"))])
  );

  fs.writeFileSync(feed, zipSync(entries));
}, 60_000);

afterAll(async () => {
  await fs.promises.rm(workDir, {recursive: true, force: true});
});

async function transferPatterns(...argv: string[]): Promise<string> {
  const {stdout} = await run(
    process.execPath,
    [path.join(import.meta.dirname, "..", "..", "..", "node_modules", "tsx", "dist", "cli.mjs"),
      cli, ...argv],
    {cwd: path.join(import.meta.dirname, "..", "..", "..")}
  );

  return stdout;
}

async function patternsIn(file: string): Promise<string[]> {
  const found: string[] = [];

  for await (const pattern of readPatternFile(file)) {
    found.push(pattern.join(" "));
  }

  return found;
}

describe("transfer-patterns", () => {
  it("finds the patterns of a feed", async () => {
    const output = path.join(workDir, "all.br");

    await transferPatterns("plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", output);

    const patterns = await patternsIn(output);

    // A journey to Deeton has to change at Ceeton, whichever end it is read from. The ends of a
    // pattern are written alphabetically, so this is the one line for both directions.
    expect(patterns).to.contain("AAA CCC DDD");
    // Ayton to Ceeton is direct, on T1.
    expect(patterns).to.contain("AAA CCC");
    // As is every leg of it.
    expect(patterns).to.contain("AAA BBB");
    expect(patterns).to.contain("BBB CCC");
    expect(patterns).to.contain("CCC DDD");
  }, 120_000);

  it("plans the same patterns in shards as it does in one go", async () => {
    const whole = path.join(workDir, "whole.br");
    const merged = path.join(workDir, "merged.br");
    const shards = [1, 2, 3].map(n => path.join(workDir, `shard-${n}.br`));

    await transferPatterns("plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", whole);

    for (const [index, shard] of shards.entries()) {
      await transferPatterns(
        "plan", feed, "--dates", "2026-06-03", "--shard", `${index + 1}/3`, "--workers", "2",
        "--out", shard
      );
    }

    await transferPatterns("merge", ...shards, "--out", merged);

    expect(await patternsIn(merged)).to.deep.equal(await patternsIn(whole));
  }, 240_000);

  it("plans several days at once, and holds the patterns of all of them", async () => {
    const tuesday = path.join(workDir, "tuesday.br");
    const both = path.join(workDir, "both.br");

    await transferPatterns(
      "plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", tuesday
    );
    await transferPatterns(
      "plan", feed, "--dates", "2026-06-03,2026-06-06", "--workers", "2", "--out", both
    );

    // Every service in the fixture runs every day, so a second day adds nothing.
    expect(await patternsIn(both)).to.deep.equal(await patternsIn(tuesday));
  }, 240_000);

  it("writes what it holds when asked", async () => {
    const output = path.join(workDir, "meta.br");
    const meta = path.join(workDir, "meta.json");

    await transferPatterns("plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", output);
    await transferPatterns("merge", output, "--out", path.join(workDir, "again.br"), "--meta", meta);

    const described = JSON.parse(await fs.promises.readFile(meta, "utf8"));

    expect(described.patterns).to.equal((await patternsIn(output)).length);
    expect(described.shards).to.equal(1);
    expect(described.generator).to.match(/^\d+\.\d+\.\d+/);
    expect(described.dates).to.deep.equal(["2026-06-03"]);
    expect(described.feed_version).to.equal("tiny");
  }, 240_000);

  it("refuses a merge that is short of a shard", async () => {
    const shards = [1, 2].map(n => path.join(workDir, `short-${n}.br`));

    for (const [index, shard] of shards.entries()) {
      await transferPatterns(
        "plan", feed, "--dates", "2026-06-03", "--shard", `${index + 1}/2`, "--workers", "2",
        "--out", shard
      );
    }

    await expect(transferPatterns(
      "merge", shards[0], "--shards", "2", "--out", path.join(workDir, "short.br")
    )).rejects.toThrow(/1 shards to merge, not the 2/);

    await transferPatterns("merge", ...shards, "--shards", "2",
      "--out", path.join(workDir, "short.br"));
  }, 240_000);

  it("refuses shards that were planned from different runs", async () => {
    const tuesday = path.join(workDir, "run-tuesday.br");
    const saturday = path.join(workDir, "run-saturday.br");

    await transferPatterns(
      "plan", feed, "--dates", "2026-06-03", "--shard", "1/2", "--workers", "2", "--out", tuesday
    );
    await transferPatterns(
      "plan", feed, "--dates", "2026-06-06", "--shard", "2/2", "--workers", "2", "--out", saturday
    );

    await expect(transferPatterns(
      "merge", tuesday, saturday, "--out", path.join(workDir, "mixed.br")
    )).rejects.toThrow(/different runs/);
  }, 240_000);

  it("refuses a worker count that would plan nothing", async () => {
    for (const workers of ["0", "-1", "four"]) {
      await expect(transferPatterns(
        "plan", feed, "--dates", "2026-06-03", "--workers", workers,
        "--out", path.join(workDir, `w-${workers}.br`)
      )).rejects.toThrow(/--workers wants a whole number of at least 1/);
    }
  }, 120_000);

  it("fails the same way on a shard that is missing as on one that is corrupt", async () => {
    await fs.promises.writeFile(path.join(workDir, "corrupt.br"), "this is not brotli");

    const failed = async (shard: string): Promise<{stderr?: string}> => transferPatterns(
      "merge", path.join(workDir, shard), "--out", path.join(workDir, `${shard}.out`)
    ).then(() => ({}), (err: {stderr?: string}) => err);

    const missing = await failed("not-here.br");
    const corrupt = await failed("corrupt.br");

    expect(missing.stderr).to.contain("ENOENT");
    expect(corrupt.stderr).to.contain("Decompression failed");

    for (const {stderr} of [missing, corrupt]) {
      expect(stderr ?? "", stderr).not.to.contain("    at ");
    }
  }, 120_000);

  /**
   * The format lives in two packages, so the round trip goes out through raptor and back in
   * through the planner rather than through the decoder that wrote it.
   */
  it("writes a file the planner it is published for can read", async () => {
    const output = path.join(workDir, "readable.br");

    await transferPatterns("plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", output);

    const stops = new StopTable();

    await loadGtfs(fs.createReadStream(feed), stops);

    const tree = await new PatternLoader(stops).load(fs.createReadStream(output));
    const named = (origin: string, destination: string) =>
      tree.getPatterns(stops.indexOf(origin), stops.indexOf(destination))
        .map(pattern => [origin, ...pattern.map(stop => stops.nameOf(stop)), destination].join(" "));

    // Ayton to Deeton has to change at Ceeton; Ayton to Ceeton does not have to change at all.
    expect(named("AAA", "DDD")).to.deep.equal(["AAA CCC DDD"]);
    expect(named("AAA", "CCC")).to.deep.equal(["AAA CCC"]);
  }, 240_000);

  it("splits into a file per station, each holding the journeys that depart it", async () => {
    const whole = path.join(workDir, "whole-for-split.br");
    const stations = path.join(workDir, "stations");

    await transferPatterns("plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", whole);
    await transferPatterns("split", whole, "--out", stations);

    const provider = new DirectoryPatternProvider(stations, ".gz");
    const patternsAt = async (station: string) => {
      const bytes = await provider.get(station);

      if (bytes === undefined) {
        return [];
      }

      // Gzip's own two bytes. These are the files a browser reads, and no browser can decompress
      // brotli, so writing one by mistake would be readable everywhere except where it has to be.
      expect([bytes[0], bytes[1]], station).to.deep.equal([0x1f, 0x8b]);

      const lines = readline.createInterface({
        input: Readable.from([Buffer.from(bytes)]).pipe(zlib.createGunzip())
      });
      const found: string[] = [];

      for await (const pattern of new PatternReader().read(lines)) {
        found.push(pattern.join(" "));
      }

      return found;
    };

    // A pattern is written under both of its ends, each time starting with the station whose file
    // it is, so a planner only ever fetches the station somebody is departing from.
    expect(await patternsAt("AAA")).to.contain("AAA CCC DDD");
    expect(await patternsAt("DDD")).to.contain("DDD CCC AAA");

    // Every line of a station's file begins with that station.
    for (const station of ["AAA", "BBB", "CCC", "DDD"]) {
      const patterns = await patternsAt(station);

      expect(patterns, station).not.to.be.empty;
      expect(patterns.every(p => p.startsWith(station)), station).to.be.true;
    }

    expect(await provider.get("BAD")).to.be.undefined;
  }, 240_000);

  it("compresses by what the file is called", async () => {
    const shard = path.join(workDir, "compression.gz");
    const gzipped = path.join(workDir, "merged-here.gz");
    const brotlied = path.join(workDir, "merged-here.br");

    await transferPatterns("plan", feed, "--dates", "2026-06-03", "--workers", "2", "--out", shard);
    await transferPatterns("merge", shard, "--out", gzipped);
    await transferPatterns("merge", shard, "--out", brotlied);

    const head = async (file: string) => (await fs.promises.readFile(file)).subarray(0, 2);

    // Gzip's two bytes, and brotli's lack of them. The extension is the only thing that differs.
    expect([...await head(shard)]).to.deep.equal([0x1f, 0x8b]);
    expect([...await head(gzipped)]).to.deep.equal([0x1f, 0x8b]);
    expect([...await head(brotlied)]).not.to.deep.equal([0x1f, 0x8b]);

    // And both say the same thing, whichever they were squeezed into.
    expect(await patternsIn(gzipped)).to.deep.equal(await patternsIn(brotlied));
  }, 240_000);

  it("refuses a date the feed does not cover", async () => {
    await expect(transferPatterns(
      "plan", feed, "--dates", "2027-06-03", "--out", path.join(workDir, "nope.br")
    )).rejects.toThrow(/does not include 2027-06-03/);
  }, 60_000);
});
