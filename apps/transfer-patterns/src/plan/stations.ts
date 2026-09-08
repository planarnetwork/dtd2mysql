import {readFeedRows} from "@gb-transit/gtfs-loader";
import type {GTFSSource} from "@gb-transit/gtfs-loader";

/**
 * A station a pattern can name, and the shard of them a job is responsible for.
 */
export type Station = string;

/**
 * The stations of a feed, in the order a pattern names them.
 *
 * Only `stops.txt` is read. The rest of a feed is expensive to build and none of it says which
 * stops are stations - and `loadGTFS` drops `stop_timezone`, which is how a station is told from
 * the platforms underneath it.
 *
 * A stop belonging to a parent is one of that parent's platforms rather than a station of its own,
 * and a station is named by its `stop_code` where it has one. That code is what a pattern is
 * written in, so the two have to agree: see `checkCodeWidths`, which will not accept a code that is
 * not three characters.
 */
export async function readStations(source: GTFSSource): Promise<Station[]> {
  const {"stops.txt": stops} = await readFeedRows(source, ["stops.txt"]);
  const stations = stops
    .filter(stop => stop.stop_timezone === "Europe/London" && !stop.parent_station)
    .map(stop => stop.stop_code ?? stop.stop_id);

  // Sorted so a shard is the same set whatever order the feed listed its stops in, which is what
  // makes a run reproducible and a shard's share of the work stable between nights.
  return [...new Set(stations)].sort();
}

/**
 * The stations belonging to one shard of `of`, numbered from 1.
 *
 * A stride rather than a block. Blocks would follow the sort, which is alphabetical, and the cost
 * of a station is the size of the place: LST, LBG and LIV in one block would leave that job running
 * long after the shard that drew the Welsh request stops had finished.
 */
export function shard(stations: readonly Station[], n: number, of: number): Station[] {
  if (!Number.isInteger(n) || !Number.isInteger(of) || of < 1 || n < 1 || n > of) {
    throw new Error(`--shard wants <n>/<of> with 1 <= n <= of, not ${n}/${of}.`);
  }

  return stations.filter((_, index) => index % of === n - 1);
}

/**
 * Read a `<n>/<of>` shard argument.
 */
export function parseShard(text: string | undefined): {n: number; of: number} {
  if (text === undefined) {
    return {n: 1, of: 1};
  }

  const [n, of] = text.split("/").map(Number);

  if (Number.isNaN(n) || Number.isNaN(of)) {
    throw new Error(`--shard wants <n>/<of>, not ${text}.`);
  }

  return {n, of};
}

/**
 * Read a `--workers` argument, or leave it to the default.
 *
 * Checked rather than coerced: `Array.from({length: NaN})` is empty, as is `{length: -1}`, so a bad
 * value here plans nothing and writes a valid empty file rather than saying anything.
 */
export function parseWorkers(text: string | undefined): number | undefined {
  if (text === undefined) {
    return undefined;
  }

  const workers = Number(text);

  if (!Number.isInteger(workers) || workers < 1) {
    throw new Error(`--workers wants a whole number of at least 1, not ${text}.`);
  }

  return workers;
}
