import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  TransferPatternMerge, checkCodeWidths, createNetwork, loadGTFS
} from "raptor-journey-planner";
import {checkWithinFeed, toISODate} from "./dates.js";
import {kWayMerge} from "./merge/kWayMerge.js";
import {readPatternFile, writePatternFile} from "./merge/patternFile.js";
import {planOnWorkers} from "./plan/pool.js";
import {readStations, shard} from "./plan/stations.js";

export interface PlanOptions {
  /** The feed to plan. Stations come from its `stops.txt` and the timetable from the rest. */
  readonly source: string;
  /** Where to write this shard's patterns. */
  readonly output: string;
  /** The days to plan. The patterns of all of them, together. */
  readonly dates: readonly Date[];
  /** Which shard of `of` this is, numbered from 1. */
  readonly n?: number;
  /** How many shards the run is split into. */
  readonly of?: number;
  /** Threads to scan on. Two fewer than the machine has cores by default. */
  readonly workers?: number;
  /** Where the workers' files go. A directory of its own under the system temp by default. */
  readonly tmp?: string;
  /** Told how far along the scan is, since a progress bar is no use in a CI log. */
  readonly onProgress?: (planned: number, total: number) => void;
}

export interface MergeOptions {
  /** Shard files, each already sorted and free of duplicates. */
  readonly inputs: readonly string[];
  /** Where to write the patterns of all of them. */
  readonly output: string;
  /**
   * How many shards the run was split into, if the caller knows.
   *
   * A merge of five shards of six is sorted, well formed, readable and quietly missing a sixth of
   * the network, so the count is stated rather than inferred from whatever a glob matched.
   */
  readonly shards?: number;
  /**
   * Where to write what the file holds, if anywhere.
   *
   * A release says how many patterns it carries, and counting them again means reading 34 million
   * of them back. The merge already knows, so it is the one thing that should be saying.
   */
  readonly meta?: string;
}

export interface PatternResult {
  /** How many distinct patterns the file holds. */
  readonly patterns: number;
  /** How large it is once compressed. */
  readonly bytes: number;
}

/**
 * Build the transfer patterns for one shard of a feed's stations, over several days.
 *
 * The feed is read once and a network built from it per date, which filters the trips to the ones
 * running that day. Building the network again costs a fraction of a second; scanning against
 * unfiltered trips would cost the whole run.
 *
 * The result is one sorted, duplicate-free file. Merging here rather than uploading the workers'
 * output is what makes the shards cheap to move: the same station on four days finds largely the
 * same patterns, and this is where those copies go.
 */
export async function plan(options: PlanOptions): Promise<PatternResult> {
  const {
    source,
    output,
    dates,
    n = 1,
    of = 1,
    workers = Math.max(1, os.cpus().length - 2),
    tmp,
    onProgress
  } = options;

  if (dates.length === 0) {
    throw new Error("No dates to plan.");
  }

  if (!Number.isInteger(workers) || workers < 1) {
    throw new Error(`A run needs at least one worker, not ${workers}.`);
  }

  const stations = shard(await readStations(fs.createReadStream(source)), n, of);

  if (stations.length === 0) {
    throw new Error(`Shard ${n} of ${of} has no stations to plan.`);
  }

  const feed = await loadGTFS(fs.createReadStream(source));

  checkWithinFeed(dates, feed.feedInfo?.startDate, feed.feedInfo?.endDate);

  const workDir = tmp ?? await fs.promises.mkdtemp(path.join(os.tmpdir(), "transfer-patterns-"));

  await fs.promises.mkdir(workDir, {recursive: true});

  try {
    const parts: string[] = [];
    let planned = 0;

    for (const [index, date] of dates.entries()) {
      const network = createNetwork(feed, date);

      // every station is written as a fixed width code, so one of another width would run into the
      // station after it and the whole line would come back wrong
      checkCodeWidths(network.stopIds);

      parts.push(...await planOnWorkers(
        network,
        date,
        stations,
        workDir,
        `${toISODate(date)}-${index}`,
        Math.min(workers, stations.length),
        () => onProgress?.(++planned, stations.length * dates.length)
      ));
    }

    const result = await new TransferPatternMerge(workDir).merge(parts, output);

    // Per shard rather than written at the end, so the merge can check the shards agree.
    await fs.promises.writeFile(provenanceFor(output), `${JSON.stringify({
      dates: dates.map(toISODate),
      feed_version: feed.feedInfo?.version ?? null,
      shard: `${n}/${of}`,
      patterns: result.patterns,
      raptor: raptorVersion()
    }, null, 2)}\n`);

    return result;
  }
  finally {
    if (tmp === undefined) {
      await fs.promises.rm(workDir, {recursive: true, force: true});
    }
  }
}

/**
 * Fold the shards of a run into the one file that gets published.
 *
 * Every shard is already sorted and free of duplicates, so this is a streaming merge rather than
 * the deal-into-buckets that produced them. It is the one stage of the run that cannot be split up
 * - the whole file goes through it - so it holds one pattern per shard and nothing else.
 */
export async function merge(options: MergeOptions): Promise<PatternResult> {
  const {inputs, output, shards, meta} = options;

  if (inputs.length === 0) {
    throw new Error("No shards to merge.");
  }

  if (shards !== undefined && inputs.length !== shards) {
    throw new Error(
      `${inputs.length} shards to merge, not the ${shards} this run was split into. A file short ` +
      "of a shard is missing that share of the network and reads no differently for it."
    );
  }

  const planned = await provenanceOf(inputs);
  const result = await writePatternFile(kWayMerge(inputs.map(readPatternFile)), output);

  if (meta !== undefined) {
    await fs.promises.writeFile(meta, `${JSON.stringify({
      built: new Date().toISOString(),
      patterns: result.patterns,
      bytes: result.bytes,
      shards: inputs.length,
      ...planned,
      raptor: raptorVersion()
    }, null, 2)}\n`);
  }

  return result;
}

/**
 * Where a shard records what it is.
 */
function provenanceFor(shard: string): string {
  return `${shard}.json`;
}

/**
 * What the shards were planned from, once it is established that they agree.
 *
 * Two that disagree are from different runs, and merging them gives a file whose patterns were
 * never all true at once. An absent file is not an error: a shard made by hand still merges, it
 * just has less to say about itself.
 */
async function provenanceOf(inputs: readonly string[]): Promise<{
  dates?: string[];
  feed_version?: string | null;
}> {
  const found = [];

  for (const input of inputs) {
    try {
      found.push(JSON.parse(await fs.promises.readFile(provenanceFor(input), "utf8")));
    }
    catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  if (found.length === 0) {
    return {};
  }

  const [first] = found;
  const differs = found.find(shard =>
    JSON.stringify(shard.dates) !== JSON.stringify(first.dates)
    || shard.feed_version !== first.feed_version);

  if (differs !== undefined) {
    throw new Error(
      `Shard ${differs.shard} was planned for ${(differs.dates ?? []).join(", ")} from feed ` +
      `${differs.feed_version}, and shard ${first.shard} for ${(first.dates ?? []).join(", ")} ` +
      `from feed ${first.feed_version}. These are different runs.`
    );
  }

  return {dates: first.dates, feed_version: first.feed_version};
}

/**
 * Which raptor found these patterns. The format is raptor's, so a file is only as readable as the
 * version that wrote it is documented.
 */
function raptorVersion(): string {
  const manifest = require.resolve("raptor-journey-planner/package.json");

  return JSON.parse(fs.readFileSync(manifest, "utf8")).version;
}
