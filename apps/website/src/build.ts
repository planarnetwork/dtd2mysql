import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The download page, generated.
 *
 * No framework. The plan said Astro or 11ty; four static pages with no client
 * side behaviour do not need a build system, and one would be a dependency to
 * keep current for the rest of the project's life. If the site grows a reason
 * for one, that is the point to add it.
 *
 * Everything the page claims is read from the published feed rather than
 * written here, so it cannot drift from what was actually built. When nothing
 * has been published the page says so instead of inventing numbers.
 */
const OWNER = "planarnetwork";
const REPO = "dtd2mysql";
const DOWNLOAD = `https://github.com/${OWNER}/${REPO}/releases/latest/download/gtfs.zip`;

interface FeedMeta {
  built: string;
  commit: string;
  trips: number;
  feed_version: string;
  feed_start_date: string;
  feed_end_date: string;
}

async function latestFeed(): Promise<FeedMeta | undefined> {
  try {
    const response = await fetch(
      `https://github.com/${OWNER}/${REPO}/releases/latest/download/feed-meta.json`,
      {redirect: "follow"}
    );

    return response.ok ? await response.json() as FeedMeta : undefined;
  }
  catch {
    // A page that builds without the network is worth more than one that
    // fails; it just has less to say.
    return undefined;
  }
}

function date(yyyymmdd: string): string {
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function page(feed: FeedMeta | undefined): string {
  const status = feed === undefined
    ? `<p class="none">No feed has been published yet. The link above will work as soon as one is.</p>`
    : `<dl>
      <dt>Covers</dt><dd>${date(feed.feed_start_date)} to ${date(feed.feed_end_date)}</dd>
      <dt>Trips</dt><dd>${feed.trips.toLocaleString("en-GB")}</dd>
      <dt>Built from</dt><dd>${feed.feed_version}</dd>
      <dt>Built</dt><dd>${new Date(feed.built).toLocaleString("en-GB", {dateStyle: "long", timeStyle: "short"})}</dd>
    </dl>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GB rail GTFS</title>
<style>
  :root { color-scheme: light dark; --edge: color-mix(in oklab, currentColor 15%, transparent); }
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem; }
  h1 { font-size: 1.6rem; margin-bottom: .25rem; }
  .lede { opacity: .75; margin-top: 0; }
  .get { display: inline-block; padding: .7rem 1.2rem; border: 1px solid var(--edge);
         border-radius: .5rem; text-decoration: none; font-weight: 600; margin: 1rem 0; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: .35rem 1.5rem; margin: 1.5rem 0; }
  dt { opacity: .7; }
  dd { margin: 0; }
  .none { opacity: .7; font-style: italic; }
  code { background: var(--edge); padding: .1rem .3rem; border-radius: .2rem; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--edge); opacity: .7; font-size: .9rem; }
</style>
</head>
<body>
<h1>GB rail GTFS</h1>
<p class="lede">The British rail timetable, as GTFS, rebuilt every night.</p>

<a class="get" href="${DOWNLOAD}">Download gtfs.zip</a>

${status}

<p>That link always resolves to the most recent feed, so it can be bookmarked or
scripted against and will not need changing.</p>

<h2>What is in it</h2>
<p>Passenger rail, sleeper services, replacement buses and the ferries the timetable
carries, from the Rail Delivery Group's DTD feed. Station coordinates come from
NaPTAN where it has them.</p>

<p>Every feed is validated with the
<a href="https://github.com/MobilityData/gtfs-validator">MobilityData validator</a> before it is
published, and a build with a referential integrity error is never released.</p>

<h2>Sources and licences</h2>
<dl>
  <dt>Timetable</dt><dd>Rail Delivery Group, via the Rail Data Marketplace</dd>
  <dt>Coordinates</dt><dd>NaPTAN, Department for Transport, Open Government Licence v3.0</dd>
</dl>

<h2>Building it yourself</h2>
<p>The tool that produces this feed is open source and needs no database:</p>
<p><code>dtd2gtfs build --source RJTTFxxx.ZIP --out gtfs.zip</code></p>

<footer>
<a href="https://github.com/${OWNER}/${REPO}">${OWNER}/${REPO}</a>
</footer>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const out = path.join(__dirname, "..", "public");

  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, "index.html"), page(await latestFeed()));

  console.log(`Wrote ${path.join(out, "index.html")}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
