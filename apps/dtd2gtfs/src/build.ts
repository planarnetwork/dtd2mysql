import * as fs from "node:fs";
import {BuildFeed, buildContext, option, options, stationCoordinates} from "@gb-rail/gtfs";
import {CifFileSource} from "@gb-rail/dtd-source";
import {FileOutput, OutputGTFSZipCommand} from "@gb-rail/gtfs-output";

/**
 * dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip
 *
 * The composition root for a build with no database in it. Give it the full
 * refresh and then each incremental, in the order they were published, and it
 * produces what importing them in that order and then exporting would.
 */
export async function build(argv: string[]): Promise<void> {
  const sources = options(argv, "source");
  const out = option(argv, "out") ?? "./gtfs.zip";

  if (sources.length === 0) {
    throw new Error("No feed to build from. Pass at least one --source RJTTFxxx.ZIP.");
  }

  for (const source of sources) {
    if (!fs.existsSync(source)) {
      throw new Error(`Source ${source} does not exist.`);
    }
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
