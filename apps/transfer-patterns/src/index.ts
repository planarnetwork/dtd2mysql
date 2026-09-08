import {option} from "@gb-transit/gtfs";
import {merge, plan} from "./api.js";
import {parseDates, toISODate} from "./dates.js";
import {showHelp} from "./help.js";
import {parseShard} from "./plan/stations.js";

/**
 * How often the scan says where it has got to. A progress bar renders to a terminal and this
 * mostly runs in CI, where one writes nothing at all and the run looks hung for an hour.
 */
const PROGRESS_EVERY = 100;

/**
 * The CLI. `main` points at api.js rather than at this, so importing the package does not run a
 * scan.
 */
async function main(argv: string[]): Promise<void> {
  if (argv.includes("--help") || argv.length < 3) {
    return showHelp();
  }

  switch (argv[2]) {
    case "plan":
      return planFeed(argv, out(argv));
    case "merge":
      return mergeShards(argv, out(argv));
    default:
      return showHelp();
  }
}

function out(argv: string[]): string {
  const output = option(argv, "out");

  if (output === undefined) {
    throw new Error("--out is required: it says where the patterns go.");
  }

  return output;
}

async function planFeed(argv: string[], output: string): Promise<void> {
  const [source] = positionalArgs(argv);

  if (source === undefined) {
    throw new Error("Which feed? transfer-patterns plan <gtfs.zip> --out <file>");
  }

  const {n, of} = parseShard(option(argv, "shard"));
  const dates = parseDates(option(argv, "dates"), new Date());
  const workers = option(argv, "workers");

  console.log(`Planning ${source} for ${dates.map(toISODate).join(", ")}`);

  const started = Date.now();
  const {patterns, bytes} = await plan({
    source,
    output,
    dates,
    n,
    of,
    workers: workers === undefined ? undefined : Number(workers),
    tmp: option(argv, "tmp"),
    onProgress: (planned, total) => {
      if (planned % PROGRESS_EVERY === 0 || planned === total) {
        console.log(`  ${planned} of ${total} scans, ${elapsed(started)}`);
      }
    }
  });

  console.log(
    `${patterns.toLocaleString()} patterns, ${megabytes(bytes)} in ${output}, ${elapsed(started)}`
  );
}

async function mergeShards(argv: string[], output: string): Promise<void> {
  const inputs = positionalArgs(argv);

  if (inputs.length === 0) {
    throw new Error("Which shards? transfer-patterns merge <shard.br>... --out <file>");
  }

  console.log(`Merging ${inputs.length} shards into ${output}`);

  const started = Date.now();
  const {patterns, bytes} = await merge({inputs, output, meta: option(argv, "meta")});

  console.log(
    `${patterns.toLocaleString()} patterns, ${megabytes(bytes)} in ${output}, ${elapsed(started)}`
  );
}

/**
 * The arguments that are not the subcommand, not a flag, and not a flag's value.
 */
function positionalArgs(argv: string[]): string[] {
  const takesValue = new Set(["--out", "--dates", "--shard", "--workers", "--tmp", "--meta"]);
  const found: string[] = [];

  for (let i = 3; i < argv.length; i++) {
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

function elapsed(started: number): string {
  const seconds = Math.round((Date.now() - started) / 1000);

  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

main(process.argv).catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
