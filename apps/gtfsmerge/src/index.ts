import * as yargs from "yargs";
import { Arguments } from "yargs";
import { Container } from "./Container";
import { toGTFSDate } from "./gtfs/calendar/toGTFSDate";
import { RouteType } from "./gtfs/GTFS";

const args = yargs.argv as Arguments<{
  "transfer-distance": number,
  "no-extra-transfers": boolean,
  "no-date-filter": boolean,
  "stop-prefix": string,
  "remove-route-types": RouteType,
  "tmp": string
}>;

const inputs = args._.slice(0, args._.length - 1);
const output = args._[args._.length - 1];
const transferDistance = args["extra-transfers"] === false ? 0 : (args["transfer-distance"] || 1.6);
const stopPrefix = args["stop-prefix"] || "";
const removeRoutes = args["remove-route-types"] ? ("" + args["remove-route-types"]).split(",") : [];
const tempFolder = args["tmp"] || "/tmp/gtfsmerge/";
const filterBeforeDate = args["date-filter"] === false ? undefined : toGTFSDate(new Date());
const container = new Container();

container
  .getMergeCommand(tempFolder, transferDistance, removeRoutes)
  .run(inputs, output, stopPrefix, filterBeforeDate)
  .catch(e => console.error(e));
