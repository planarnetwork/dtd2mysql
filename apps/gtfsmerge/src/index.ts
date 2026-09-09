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

  // Feeds and somewhere to put them. Without the check the output is undefined
  // and the failure comes from whatever tries to open it.
  if (positional.length < 2) {
    return showHelp();
  }

  await merge({
    inputs: positional.slice(0, -1),
    output: positional[positional.length - 1],
    transferDistance: argv.includes("--no-extra-transfers")
      ? 0
      : Number(option(argv, "transfer-distance") ?? 1.6),
    filterDatesBefore: argv.includes("--no-date-filter")
      ? undefined
      : option(argv, "date-filter") ?? toGTFSDate(new Date()),
    removeRouteTypes: (option(argv, "remove-route-types") ?? "").split(",").filter(t => t !== ""),
    shapes: !argv.includes("--no-shapes"),
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
    "--transfer-distance", "--remove-route-types", "--ruler-latitude", "--tmp", "--date-filter"
  ]);
  const flags = new Set([
    "--help", "--no-extra-transfers", "--no-date-filter", "--no-shapes"
  ]);
  const found: string[] = [];

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith("--")) {
      found.push(arg);

      continue;
    }

    // `--name value` consumes the next argument; `--name=value` does not.
    const [name] = arg.split("=");

    if (takesValue.has(name)) {
      if (!arg.includes("=")) {
        i++;
      }
    }
    else if (!flags.has(name)) {
      // An option nobody knows is a mistake, and taken as a flag it makes its
      // value a positional: `--stop-prefix x_ a.zip out.zip` merged a feed
      // called `x_` and failed on a missing file rather than on the option.
      throw new Error(`Unknown option ${name}. Run with --help for the ones there are.`);
    }
  }

  return found;
}

main(process.argv).catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
