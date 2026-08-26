import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {NAPTAN, NaptanEnricher, naptanFromApi} from "@gb-transit/enrich-naptan";
import {STATION_GROUPS, StationGroupsExtension, groupsFromFeed} from "@gb-transit/extend-station-groups";
import {parse} from "yaml";
import {BuildConfig, BuildContext, Enricher, EnricherConfig, Extension, parseConfig} from "@gb-transit/gtfs";
import {BuildFeed, buildContext, dateRange, option, options, stationCoordinates} from "@gb-transit/gtfs";
import {CifFileSource, timetableFeeds} from "@gb-transit/dtd-source";
import {FileOutput, OutputGTFSZipCommand} from "@gb-transit/gtfs-output";

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

  const feed = new BuildFeed(
    new CifFileSource(sources, stationCoordinates, dateRange(context)),
    new FileOutput(),
    context,
    registered(config),
    registeredExtensions(config, context, given)
  );

  if (out.endsWith(".zip")) {
    return new OutputGTFSZipCommand(feed).build(out);
  }

  if (!fs.existsSync(out)) {
    fs.mkdirSync(out, {recursive: true});
  }

  return feed.build(out);
}

/**
 * The enrichers this build can run, by key.
 *
 * A config naming one that is not here fails immediately with a list of what
 * is, rather than being ignored and producing a feed quietly missing whatever
 * that source was for.
 */
function registered(config: BuildConfig | undefined): Enricher[] {
  const cache = path.join(os.tmpdir(), "gb-rail-enrichment");

  // Built from its settings rather than filtered after the fact, because an
  // enricher's options are constructor arguments - `options:` was parsed and
  // then dropped on the floor before this.
  const available: {[key: string]: (settings: EnricherConfig) => Enricher} = {
    [NAPTAN]: settings => new NaptanEnricher(
      naptanFromApi(cache),
      settings.priority ?? 50,
      settings.options.inactive !== false,
      settings.options.names === true
    )
  };

  return (config?.enrichers ?? [])
    .filter(settings => available[settings.key] !== undefined)
    .map(settings => available[settings.key](settings));
}

/**
 * The extensions this build can run, by key.
 *
 * Unlike enrichers, an extension takes its settings as plain options, because
 * there is no field for two of them to contest. `STATION_GROUPS` needs to be
 * told where the fares feed is, and defaults to looking beside the timetable
 * feed - which is where it already is when a build reads a directory.
 */
function registeredExtensions(
  config: BuildConfig | undefined,
  context: BuildContext,
  given: readonly string[]
): Extension[] {
  const wanted = new Map((config?.extensions ?? []).map(e => [e.key, e]));
  const settings = wanted.get(STATION_GROUPS);

  if (settings === undefined) {
    return [];
  }

  const source = settings.options.source === undefined
    ? beside(given)
    : String(settings.options.source);

  return [
    new StationGroupsExtension(groupsFromFeed(source), context.today.toString())
  ];
}

/**
 * Where to look for the fares feed when the config does not say.
 *
 * The timetable sources are files or directories; a fares refresh sits in the
 * same directory as the timetable one it was published alongside, so that is
 * where to look before asking anybody to write it down.
 */
function beside(given: readonly string[]): string {
  const first = given[0];

  return fs.existsSync(first) && fs.statSync(first).isDirectory() ? first : path.dirname(first);
}

const REGISTERED = [NAPTAN];
const REGISTERED_EXTENSIONS = [STATION_GROUPS];

function readConfig(path: string | undefined): BuildConfig | undefined {
  if (path === undefined) {
    return undefined;
  }

  if (!fs.existsSync(path)) {
    throw new Error(`No config file at ${path}.`);
  }

  try {
    return parseConfig(parse(fs.readFileSync(path, "utf8")), REGISTERED, REGISTERED_EXTENSIONS);
  }
  catch (err) {
    // The file is named, because "licence must be one of" is a puzzle when
    // three configs are in play and the error does not say which one.
    throw new Error(`${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
