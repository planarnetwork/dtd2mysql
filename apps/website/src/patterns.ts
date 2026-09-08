import * as fs from "node:fs";
import * as path from "node:path";
import {readFeedRows} from "@gb-transit/gtfs-loader";
import {REPO} from "./site.js";

/**
 * A station somebody can fetch the patterns of.
 */
export interface PatternStation {
  /** The CRS code, which is what the file is named after. */
  code: string;
  /** What to call it, where the feed says. */
  name?: string;
  /** How large its file is. */
  bytes: number;
}

/**
 * Where the Pages workflow leaves what it publishes. Both are read at build time and neither is in
 * the repository: the feed is downloaded from the release and the patterns are broken out of it.
 *
 * From the working directory rather than from `import.meta.url`, which points into the bundle astro
 * builds this module into rather than at the file it was written in.
 */
const PUBLIC = path.join(process.cwd(), "public");
const DIRECTORY = path.join(PUBLIC, "transfer-patterns");
const WHOLE = path.join(PUBLIC, "transfer-patterns.br");
const FEED = path.join(PUBLIC, "gtfs.zip");

/**
 * The site is served from a project page, so it lives under a path rather than at the root of the
 * origin. Astro carries that path into the links it generates from routes, and these are not those:
 * they are files in `public/`, addressed by hand, so they have to carry it themselves.
 *
 * From the repository name rather than from `import.meta.env.BASE_URL`, which is a vite global this
 * module is not typechecked against, and which would say `/` under vitest either way. `base` in the
 * astro config is the same name.
 */
const BASE = `/${REPO}`;

/** Where a browser fetches them from, which is the same directory served. */
export const PATTERNS_PATH = `${BASE}/transfer-patterns`;

/** The whole set, mirrored into the site beside the stations it was broken into. */
export const WHOLE_PATH = `${BASE}/transfer-patterns.br`;

/** The stations there are files for, for a reader that wants the list as data. */
export const STATIONS_PATH = `${BASE}/transfer-patterns.json`;

/**
 * How large the whole set is, where the site is serving it.
 *
 * Undefined rather than zero when it is not, which is what the page reads to decide between
 * offering what it serves and pointing at the release.
 */
export function wholeBytes(): number | undefined {
  return fs.existsSync(WHOLE) ? fs.statSync(WHOLE).size : undefined;
}

/**
 * Every station the split wrote a file for, named where the feed can say.
 *
 * Read from the directory rather than from a list, so the page cannot offer a station whose file is
 * not there. A build with no patterns beside it - anybody's checkout, or a night whose scan did not
 * finish - gets an empty list and a page that says so, which is better than a page of links that
 * 404.
 */
export async function patternStations(): Promise<PatternStation[]> {
  if (!fs.existsSync(DIRECTORY)) {
    return [];
  }

  const names = await stationNames();
  const stations = fs.readdirSync(DIRECTORY)
    .filter(file => file.endsWith(".br"))
    .map(file => {
      const code = file.slice(0, -".br".length);

      return {code, name: names.get(code), bytes: fs.statSync(path.join(DIRECTORY, file)).size};
    });

  return stations.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * The station names of the feed published beside these, by CRS code.
 *
 * A three letter code is not a station to most people, and the feed is already here to be
 * downloaded. Absent where it is not, which only costs the page its names.
 */
async function stationNames(): Promise<Map<string, string>> {
  if (!fs.existsSync(FEED)) {
    return new Map();
  }

  const {"stops.txt": stops} = await readFeedRows(fs.createReadStream(FEED), ["stops.txt"]);

  return new Map(stops
    .filter(stop => stop.stop_code !== undefined && !stop.parent_station)
    .map(stop => [stop.stop_code as string, stop.stop_name as string]));
}

/**
 * The stations under each letter they begin with, for a list of 2,797 of them that somebody has to
 * be able to find their way around.
 */
export function byLetter(stations: readonly PatternStation[]): [string, PatternStation[]][] {
  const letters = new Map<string, PatternStation[]>();

  for (const station of stations) {
    const letter = station.code.slice(0, 1).toUpperCase();

    letters.set(letter, [...(letters.get(letter) ?? []), station]);
  }

  return [...letters].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * A size somebody can read, which for these is always kilobytes.
 */
export function kilobytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
