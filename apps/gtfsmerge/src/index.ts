import * as yargs from "yargs";
import {Arguments} from "yargs";
import {Container} from "./Container";

const args = yargs.argv as Arguments<{
  "transfer-distance": number,
  "stop-prefix": string,
  "tmp": string
}>;

const inputs = args._.slice(0, args._.length - 1);
const output = args._[args._.length - 1];
const transferDistance = args["transfer-distance"] || 0.02;
const stopPrefix = args["stop-prefix"] || "";
const tempFolder = args["tmp"] || "/tmp/gtfsmerge/";
const container = new Container();

container
  .getMergeCommand(transferDistance, tempFolder)
  .run(inputs, output, tempFolder, stopPrefix)
  .catch(e => console.error(e));
