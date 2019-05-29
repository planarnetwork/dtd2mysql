import * as yargs from "yargs";
import { Arguments } from "yargs";
import { Container } from "./Container";
import { toGTFSDate } from "./gtfs/calendar/toGTFSDate";

const args = yargs.argv as Arguments<{
  "transfer-distance": number,
  "no-date-filter": boolean,
  "stop-prefix": string,
  "tmp": string
}>;

const inputs = args._.slice(0, args._.length - 1);
const output = args._[args._.length - 1];
const transferDistance = args["transfer-distance"] || 0.02;
const stopPrefix = args["stop-prefix"] || "";
const tempFolder = args["tmp"] || "/tmp/gtfsmerge/";
const filterBeforeDate = args["no-date-filter"] ? undefined : toGTFSDate(new Date());
const container = new Container();

container
  .getMergeCommand(tempFolder, transferDistance)
  .run(inputs, output, stopPrefix, filterBeforeDate)
  .catch(e => console.error(e));
