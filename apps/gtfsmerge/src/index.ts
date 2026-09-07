import {option} from "@gb-transit/gtfs";
import {merge} from "./api";
import {showHelp} from "./help";
import {toGTFSDate} from "./gtfs/calendar/gtfsDateUtils";

/**
 * The CLI. `main` points at api.js rather than at this, so importing the package
 * does not run a merge.
 */
async function main(argv: string[]): Promise<void> {
  if (argv.includes("--help") || argv.length < 4) {
    return showHelp();
  }

  const positional = positionalArgs(argv);

  await merge({
    inputs: positional.slice(0, -1),
    output: positional[positional.length - 1],
    stopPrefix: option(argv, "stop-prefix"),
    transferDistance: argv.includes("--no-extra-transfers")
      ? 0
      : Number(option(argv, "transfer-distance") ?? 1.6),
    filterDatesBefore: argv.includes("--no-date-filter") ? undefined : toGTFSDate(new Date()),
    removeRouteTypes: (option(argv, "remove-route-types") ?? "").split(",").filter(t => t !== ""),
    rulerLatitude: option(argv, "ruler-latitude") === undefined
      ? undefined
      : Number(option(argv, "ruler-latitude")),
    tmp: option(argv, "tmp")
  });
}

/**
 * The arguments that are not flags, and not a flag's value.
 */
function positionalArgs(argv: string[]): string[] {
  const takesValue = new Set([
    "--stop-prefix", "--transfer-distance", "--remove-route-types", "--ruler-latitude", "--tmp"
  ]);
  const found: string[] = [];

  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      // `--name value` consumes the next argument; `--name=value` does not.
      if (takesValue.has(argv[i])) {
        i++;
      }
    }
    else {
      found.push(argv[i]);
    }
  }

  return found;
}

main(process.argv).catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
