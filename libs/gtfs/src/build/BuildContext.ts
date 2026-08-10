/**
 * Everything about a build that is not the data: which day it is being built for,
 * and how far ahead it reaches.
 *
 * The clock is a value rather than a call to CURDATE() so that the same feed can
 * be regenerated tomorrow and compared to the one generated today. Without that
 * the output is a function of the day it ran and no baseline means anything.
 */
export interface BuildContext {
  readonly today: Temporal.PlainDate;
  readonly range: Temporal.Duration;
}

/**
 * The window a build covers: `from` inclusive, `to` exclusive.
 *
 * Every date-filtered query derives its window from this one value. Two of them
 * used to hardcode INTERVAL 3 MONTH while the third interpolated GTFS_RANGE, so
 * GTFS_RANGE=6 MONTH produced six months of trains with three months of
 * replacement buses and associations.
 */
export interface DateRange {
  readonly from: Temporal.PlainDate;
  readonly to: Temporal.PlainDate;
}

export function dateRange(context: BuildContext): DateRange {
  return {
    from: context.today,
    to: context.today.add(context.range)
  };
}

const units: { [unit: string]: "days" | "weeks" | "months" | "years" } = {
  day: "days",
  days: "days",
  week: "weeks",
  weeks: "weeks",
  month: "months",
  months: "months",
  year: "years",
  years: "years"
};

/**
 * Read a range written the way GTFS_RANGE has always been written, which is a
 * MySQL interval expression: "3 MONTH", "6 months", "28 days".
 */
export function parseRange(text: string): Temporal.Duration {
  const parsed = /^\s*(\d+)\s+([a-z]+)\s*$/i.exec(text);
  const unit = parsed && units[parsed[2].toLowerCase()];

  if (!parsed || !unit) {
    throw new Error(`Cannot read "${text}" as a range. Expected something like "3 months".`);
  }

  return Temporal.Duration.from({[unit]: parseInt(parsed[1], 10)});
}

/**
 * Read `--name value` or `--name=value` from anywhere in argv. The command
 * itself is argv[2] and the output path argv[3], so options are positional-safe
 * only after those; nothing here assumes an index.
 */
export function option(argv: string[], name: string): string | undefined {
  const flag = `--${name}`;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag) {
      return argv[i + 1];
    }
    if (argv[i].startsWith(`${flag}=`)) {
      return argv[i].slice(flag.length + 1);
    }
  }

  return undefined;
}

/**
 * Read every `--name value` and `--name=value` from argv, for options that can
 * be given more than once.
 */
export function options(argv: string[], name: string): string[] {
  const flag = `--${name}`;
  const values: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1] !== undefined) {
      values.push(argv[i + 1]);
    }
    else if (argv[i].startsWith(`${flag}=`)) {
      values.push(argv[i].slice(flag.length + 1));
    }
  }

  return values;
}

/**
 * Resolve the build context from the command line and the environment.
 *
 * `--today` wins over GTFS_TODAY, which wins over the real date; `--range` wins
 * over GTFS_RANGE, which wins over three months. A scheduled build passes
 * nothing and gets today; a test pins the date and gets a reproducible feed.
 */
export function buildContext(argv: string[], env: NodeJS.ProcessEnv = process.env): BuildContext {
  const today = option(argv, "today") ?? env.GTFS_TODAY;
  const range = option(argv, "range") ?? env.GTFS_RANGE;

  return {
    today: today ? Temporal.PlainDate.from(today) : Temporal.Now.plainDateISO(),
    range: parseRange(range ?? "3 MONTH")
  };
}
