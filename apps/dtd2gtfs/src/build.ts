import * as fs from "node:fs";
import {parse} from "yaml";
import {BuildConfig, parseConfig} from "@gb-rail/gtfs";
import {BuildFeed, buildContext, option, options, stationCoordinates} from "@gb-rail/gtfs";
import {CifFileSource, timetableFeeds} from "@gb-rail/dtd-source";
import {FileOutput, OutputGTFSZipCommand} from "@gb-rail/gtfs-output";

/**
 * dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip
 *
 * The composition root for a build with no database in it. Give it the full
 * refresh and then each incremental, in the order they were published, and it
 * produces what importing them in that order and then exporting would.
 */
export async function build(argv: string[]): Promise<void> {
  // A config file and flags describe the same build. Flags win where both say
  // something, so a config can be a starting point rather than a commitment.
  const config = readConfig(option(argv, "config"));
  const out = option(argv, "out") ?? config?.out ?? "./gtfs.zip";
  const given = [...options(argv, "source"), ...(config?.source ?? [])];

  if (given.length === 0) {
    throw new Error("No feed to build from. Pass at least one --source RJTTFxxx.ZIP or --source DIR.");
  }

  const sources = timetableFeeds(given);

  if (sources.length === 0) {
    throw new Error(`No timetable feed found in ${given.join(", ")}. Expected files named RJTTFxxx.ZIP or RJTTCxxx.ZIP.`);
  }

  const context = buildContext(
    argv,
    // The config's today and range reach buildContext the same way the
    // environment does, so there is one place that decides precedence.
    {
      ...process.env,
      GTFS_TODAY: process.env.GTFS_TODAY ?? config?.today,
      GTFS_RANGE: process.env.GTFS_RANGE ?? config?.range,
      GTFS_LINKS: process.env.GTFS_LINKS ?? (config?.links ? "1" : undefined)
    }
  );

  console.log(`Reading ${sources.join(", ")}`);

  const feed = new BuildFeed(new CifFileSource(sources, stationCoordinates), new FileOutput(), context);

  if (out.endsWith(".zip")) {
    return new OutputGTFSZipCommand(feed).build(out);
  }

  if (!fs.existsSync(out)) {
    fs.mkdirSync(out, {recursive: true});
  }

  return feed.build(out);
}

/**
 * The enrichers this build can run, by key. Empty until there is one - and an
 * empty registry is what makes an enricher named in a config fail immediately
 * with a list of what is available, rather than being ignored.
 */
const REGISTERED: string[] = [];

function readConfig(path: string | undefined): BuildConfig | undefined {
  if (path === undefined) {
    return undefined;
  }

  if (!fs.existsSync(path)) {
    throw new Error(`No config file at ${path}.`);
  }

  try {
    return parseConfig(parse(fs.readFileSync(path, "utf8")), REGISTERED);
  }
  catch (err) {
    // The file is named, because "licence must be one of" is a puzzle when
    // three configs are in play and the error does not say which one.
    throw new Error(`${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
