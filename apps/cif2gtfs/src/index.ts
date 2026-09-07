import {build} from "./build";
import {showHelp} from "./help";

const command = process.argv[2] === "build" ? build : showHelp;

command(process.argv).catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
