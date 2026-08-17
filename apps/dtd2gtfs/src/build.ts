import * as fs from "node:fs";
import {BuildFeed, buildContext, option, options, stationCoordinates} from "@gb-transit/gtfs";
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
  const out = option(argv, "out") ?? "./gtfs.zip";
  const given = options(argv, "source");

  if (given.length === 0) {
    throw new Error("No feed to build from. Pass at least one --source RJTTFxxx.ZIP or --source DIR.");
  }

  const sources = timetableFeeds(given);

  if (sources.length === 0) {
    throw new Error(`No timetable feed found in ${given.join(", ")}. Expected files named RJTTFxxx.ZIP or RJTTCxxx.ZIP.`);
  }

  const context = buildContext(argv);

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
