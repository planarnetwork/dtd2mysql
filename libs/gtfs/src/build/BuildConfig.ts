/**
 * A build, described in a file rather than in a command line.
 *
 * Once a build selects sources, a date, a window, a licence tier and a list of
 * enrichers each with their own options, the flags stop being a reasonable way
 * to say it - and, more to the point, stop being reviewable. A nightly that
 * differs from yesterday's should differ by a diff somebody approved.
 *
 * Validated by hand rather than by a schema library: the errors are the whole
 * point of this file existing, and "must match schema #/enrichers" helps
 * nobody at 3am when a feed did not build.
 */
export interface BuildConfig {
  readonly source: readonly string[];
  readonly out: string;
  readonly today?: string;
  readonly range?: string;
  readonly links: boolean;
  readonly licence: Licence;
  readonly enrichers: readonly EnricherConfig[];
  readonly extensions: readonly string[];
}

/**
 * Which sources a build is allowed to draw on. D8 produces one artifact per
 * tier and fails a build that mixes a share-alike source into the permissive
 * one, rather than discovering the obligation after publishing.
 */
export type Licence = "permissive" | "full";

export interface EnricherConfig {
  readonly key: string;
  /** Overrides the enricher's own, when one source should outrank another here. */
  readonly priority?: number;
  /**
   * The only fields this enricher may write. Absent means no restriction.
   *
   * The point is to take a source for the one thing it is good at. NaPTAN has
   * excellent coordinates and station names that are not the ones on the
   * departure boards, and there is no reason to accept both to get one.
   */
  readonly apply?: readonly string[];
  readonly options: {readonly [key: string]: unknown};
}

const LICENCES: Licence[] = ["permissive", "full"];
const TOP_LEVEL = ["source", "out", "today", "range", "links", "licence", "enrichers", "extensions"];

/**
 * Check a parsed config and say precisely what is wrong with it.
 *
 * `known` is the set of enricher keys the build has registered. An unknown one
 * fails here rather than being ignored: a typo in an enricher name would
 * otherwise produce a feed that is quietly missing whatever it was supposed to
 * add, and nothing downstream could tell that from a source with no matches.
 */
export function parseConfig(raw: unknown, known: readonly string[] = []): BuildConfig {
  const config = object(raw, "the config");

  for (const key of Object.keys(config)) {
    if (!TOP_LEVEL.includes(key)) {
      throw new Error(`${key} is not a config option. Expected one of: ${TOP_LEVEL.join(", ")}.`);
    }
  }

  const source = list(config.source, "source");

  if (source.length === 0) {
    throw new Error("source needs at least one feed file or directory.");
  }

  const licence = config.licence === undefined ? "permissive" : String(config.licence);

  if (!LICENCES.includes(licence as Licence)) {
    throw new Error(`licence must be one of: ${LICENCES.join(", ")}. Got ${licence}.`);
  }

  return {
    source,
    out: config.out === undefined ? "gtfs.zip" : String(config.out),
    today: config.today === undefined ? undefined : String(config.today),
    range: config.range === undefined ? undefined : String(config.range),
    links: config.links === true,
    licence: licence as Licence,
    enrichers: enrichers(config.enrichers, known),
    extensions: config.extensions === undefined ? [] : list(config.extensions, "extensions")
  };
}

function enrichers(raw: unknown, known: readonly string[]): EnricherConfig[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  const configured = object(raw, "enrichers");

  return Object.keys(configured).sort().map(key => {
    if (!known.includes(key)) {
      throw new Error(
        `${key} is not an enricher this build knows about. ` +
        `Available: ${known.length > 0 ? [...known].sort().join(", ") : "none are registered"}.`
      );
    }

    // `NAPTAN:` with nothing under it means "on, with its own defaults", which
    // is the common case and should not need an empty object written out.
    const settings = configured[key] === null || configured[key] === undefined
      ? {}
      : object(configured[key], key);

    for (const option of Object.keys(settings)) {
      if (!["priority", "apply", "options"].includes(option)) {
        throw new Error(`${key}.${option} is not an enricher option. Expected priority, apply or options.`);
      }
    }

    if (settings.priority !== undefined && typeof settings.priority !== "number") {
      throw new Error(`${key}.priority must be a number. Got ${JSON.stringify(settings.priority)}.`);
    }

    return {
      key,
      priority: settings.priority as number | undefined,
      apply: settings.apply === undefined ? undefined : list(settings.apply, `${key}.apply`),
      options: settings.options === undefined ? {} : object(settings.options, `${key}.options`)
    };
  });
}

function object(value: unknown, what: string): {[key: string]: unknown} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${what} must be a set of keys and values. Got ${describe(value)}.`);
  }

  return value as {[key: string]: unknown};
}

function list(value: unknown, what: string): string[] {
  // A single string where a list is expected is the obvious thing to write and
  // there is no reason to reject it.
  if (typeof value === "string") {
    return [value];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${what} must be a list. Got ${describe(value)}.`);
  }

  return value.map(String);
}

function describe(value: unknown): string {
  return value === null ? "nothing"
    : Array.isArray(value) ? "a list"
      : typeof value;
}
