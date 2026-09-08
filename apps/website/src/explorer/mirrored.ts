import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Which of the things the explorer reads the build actually put beside the site.
 *
 * Read at build time, exactly as the transfer patterns are, so that "the feed is not here" is a fact
 * the page is built with rather than something the browser discovers by asking for a file and being
 * given a 404. Nothing here is in the repository: the Pages workflow downloads them from the latest
 * release before the site is built, and a checkout has none of them.
 *
 * From the working directory rather than from import.meta.url, which points into the bundle astro
 * builds this into rather than at the file it was written in.
 */
const PUBLIC = path.join(process.cwd(), "public");

export interface Asset {
  readonly file: string;
  readonly path: string;
  readonly bytes: number;
}

/** The feed itself, which is the one the page offers to open. */
export const FEED = "gtfs.zip";

/** What the nightly publishes about the feed, each of which one view depends on. */
export const SIDECARS = [
  "feed-meta.json", "validation.json", "provenance.json", "enrichment-report.json"
] as const;

export function mirrored(file: string): Asset | undefined {
  const full = path.join(PUBLIC, file);

  return fs.existsSync(full) ? {file, path: `/${file}`, bytes: fs.statSync(full).size} : undefined;
}

/**
 * Everything the page can offer, as the JSON it embeds for its own script to read.
 *
 * The base path is added by the caller, which knows it. A page cannot ask the browser for
 * `/gtfs.zip` when the site is served from a subdirectory.
 */
export function assets(): {feed?: Asset, sidecars: Asset[], baseline: unknown} {
  const feed = mirrored(FEED);

  return {
    ...(feed === undefined ? {} : {feed}),
    sidecars: SIDECARS.map(mirrored).filter((asset): asset is Asset => asset !== undefined),
    baseline: baseline()
  };
}

/**
 * The errors the release accepts, and the reason it gives for each.
 *
 * Read out of the repository at build time rather than imported, so `.github/validator-baseline.json`
 * stays the one place they are written down. Without it the validation view would show a wall of
 * errors against a feed that passes its own gate, which is worse than showing nothing.
 */
function baseline(): unknown {
  // From the workspace rather than from the site: this is a file of the repository, not of the
  // build. A checkout that somehow lacks it costs the reasons, not the page.
  const file = path.join(process.cwd(), "..", "..", ".github", "validator-baseline.json");

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  catch {
    return {};
  }
}
