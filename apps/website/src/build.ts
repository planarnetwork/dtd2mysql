import * as fs from "node:fs";
import * as path from "node:path";
import {marked} from "marked";

/**
 * The site, generated. Two pages: the download page and the guide.
 *
 * No framework. The plan said Astro or 11ty; a couple of static pages with no
 * client side behaviour do not need a build system, and one would be a
 * dependency to keep current for the rest of the project's life. If the site
 * grows a reason for one, that is the point to add it.
 *
 * Everything the pages claim about the feed is read from the published feed
 * rather than written here, so it cannot drift from what was actually built.
 * When nothing has been published they say so instead of inventing numbers.
 */
const OWNER = "planarnetwork";
const REPO = "dtd2mysql";
const RELEASE = `https://github.com/${OWNER}/${REPO}/releases/latest/download`;
const DOWNLOAD = `${RELEASE}/gtfs.zip`;
const DOWNLOAD_PASSING = `${RELEASE}/gtfs-passing-points.zip`;

export interface FeedMeta {
  built: string;
  commit: string;
  trips: number;
  feed_version: string;
  feed_start_date: string;
  feed_end_date: string;
  /**
   * The two feeds differ by these and nothing else. Releases published before
   * the second feed existed have neither, so the guide says how they differ
   * rather than by how much.
   */
  stop_times?: number;
  stop_times_with_passing_points?: number;
  /**
   * Who the feed was built from, as the build itself credited them. Older
   * releases predate this and have none, which is why the page falls back to
   * naming the timetable rather than showing an empty list.
   */
  sources?: Source[];
}

interface Source {
  organisation: string;
  licence: string;
  url?: string;
}

/**
 * The one source every feed has had. Only used for a release published before
 * the build started declaring them.
 */
const TIMETABLE: Source = {
  organisation: "Rail Delivery Group",
  licence: "Rail Settlement Plan data licence",
  url: "https://raildata.org.uk/"
};

/**
 * Sources and licences, from the feed rather than from here.
 *
 * NaPTAN is Open Government Licence v3.0, which makes acknowledgement a
 * condition of use - so a hardcoded list that forgets a source is not just
 * out of date, it is the page failing to do the one thing it is for.
 */
export function sources(feed: FeedMeta | undefined): string {
  const listed = feed?.sources?.length ? feed.sources : [TIMETABLE];

  return listed.map(source => `<dt>${escape(source.organisation)}</dt><dd>${
    source.url
      ? `<a href="${escape(source.url)}">${escape(source.licence)}</a>`
      : escape(source.licence)
  }</dd>`).join("\n  ");
}

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function latestFeed(): Promise<FeedMeta | undefined> {
  try {
    const response = await fetch(`${RELEASE}/feed-meta.json`, {redirect: "follow"});

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

function number(value: number): string {
  return value.toLocaleString("en-GB");
}

/**
 * What the published feed holds, as a table, or a note that there is nothing to
 * describe. The guide states shapes rather than counts everywhere else, because
 * a figure measured against a refresh from six months ago rots in silence and
 * nothing here would catch it. These come from the release.
 */
function summary(feed: FeedMeta | undefined): string {
  if (feed === undefined) {
    return `<p class="none">No feed has been published yet, so there are no figures to give.</p>`;
  }

  const rows = [
    `<dt>Covers</dt><dd>${date(feed.feed_start_date)} to ${date(feed.feed_end_date)}</dd>`,
    `<dt>Trips</dt><dd>${number(feed.trips)}</dd>`
  ];

  if (feed.stop_times !== undefined) {
    rows.push(`<dt>Stop times</dt><dd>${number(feed.stop_times)}</dd>`);
  }

  if (feed.stop_times_with_passing_points !== undefined) {
    rows.push(`<dt>With passing points</dt><dd>${number(feed.stop_times_with_passing_points)}</dd>`);
  }

  rows.push(`<dt>Built from</dt><dd>${escape(feed.feed_version)}</dd>`);
  rows.push(`<dt>Built</dt><dd>${built(feed)}</dd>`);

  return `<dl>\n  ${rows.join("\n  ")}\n</dl>`;
}

function built(feed: FeedMeta): string {
  return new Date(feed.built).toLocaleString("en-GB", {dateStyle: "long", timeStyle: "short"});
}

/**
 * Where the guide links to the feed. These go in before the markdown is
 * rendered: a token in a link destination is a URL as far as marked is
 * concerned, and it comes out percent encoded and broken.
 */
const LINKS: Record<string, string> = {
  download: DOWNLOAD,
  downloadPassingPoints: DOWNLOAD_PASSING
};

/**
 * What the guide is allowed to say about the published feed. Everything else in
 * it is prose about how the feed is built, which is true whatever was built
 * last night.
 *
 * These go in after the markdown is rendered, so what an external source
 * supplies reaches the page through escape() rather than through a parser that
 * passes HTML through by design.
 */
const TOKENS: Record<string, (feed: FeedMeta | undefined) => string> = {summary, sources};

function substitute(text: string, resolve: (name: string) => string | undefined): string {
  return text.replace(/\{\{(\w+)}}/g, (whole, name: string) => resolve(name) ?? whole);
}

/**
 * The guide's markdown, as the HTML the page carries.
 *
 * An unresolved token throws rather than reaching the page. Publishing
 * {{summary}} to the world is worse than not deploying, and the encoded form is
 * checked for as well because that is what an unresolved link destination
 * becomes.
 */
export function fill(markdown: string, feed: FeedMeta | undefined): string {
  const html = render(substitute(markdown, name => LINKS[name]));
  const filled = substitute(html, name => TOKENS[name]?.(feed));
  const left = filled.match(/\{\{[^}]*}}|%7B%7B[^%]*%7D%7D/i);

  if (left !== null) {
    throw new Error(`${left[0]} is not a token this understands, so it would have been published as it is.`);
  }

  return filled;
}

function slug(heading: string): string {
  return heading
    .replace(/<[^>]*>/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Markdown to the HTML the page carries, with two things marked does not do.
 *
 * Every h2 gets an id derived from its text, so the contents at the top of the
 * guide can link to the section it names. And every table is wrapped, because a
 * table wider than the screen has to scroll inside its own box rather than
 * taking the page with it.
 */
export function render(markdown: string): string {
  const html = marked.parse(markdown, {async: false});

  return html
    .replace(/<h2>(.*?)<\/h2>/g, (_, text: string) => `<h2 id="${slug(text)}">${text}</h2>`)
    .replace(/<table>[\s\S]*?<\/table>/g, table => `<div class="scroll">${table}</div>`);
}

function chrome(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; --edge: color-mix(in oklab, currentColor 15%, transparent); }
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem; }
  h1 { font-size: 1.6rem; margin-bottom: .25rem; }
  h2 { font-size: 1.2rem; margin-top: 2.5rem; }
  h3 { font-size: 1rem; margin-top: 2rem; }
  .lede { opacity: .75; margin-top: 0; }
  .get { display: inline-block; padding: .7rem 1.2rem; border: 1px solid var(--edge);
         border-radius: .5rem; text-decoration: none; font-weight: 600; margin: 1rem 0; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: .35rem 1.5rem; margin: 1.5rem 0; }
  dt { opacity: .7; }
  dd { margin: 0; }
  .none { opacity: .7; font-style: italic; }
  code { background: var(--edge); padding: .1rem .3rem; border-radius: .2rem; }
  pre { overflow-x: auto; padding: .8rem 1rem; border: 1px solid var(--edge); border-radius: .3rem; }
  pre code { background: none; padding: 0; }
  .scroll { overflow-x: auto; margin: 1.5rem 0; }
  table { border-collapse: collapse; font-size: .95rem; }
  th, td { text-align: left; vertical-align: top; padding: .35rem 1rem .35rem 0; border-bottom: 1px solid var(--edge); }
  li { margin: .35rem 0; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--edge); opacity: .7; font-size: .9rem; }
</style>
</head>
<body>
${body}
<footer>
<a href="https://github.com/${OWNER}/${REPO}">${OWNER}/${REPO}</a>
</footer>
</body>
</html>
`;
}

function page(feed: FeedMeta | undefined): string {
  const status = feed === undefined
    ? `<p class="none">No feed has been published yet. The link above will work as soon as one is.</p>`
    : `<dl>
      <dt>Covers</dt><dd>${date(feed.feed_start_date)} to ${date(feed.feed_end_date)}</dd>
      <dt>Trips</dt><dd>${number(feed.trips)}</dd>
      <dt>Built from</dt><dd>${escape(feed.feed_version)}</dd>
      <dt>Built</dt><dd>${built(feed)}</dd>
    </dl>`;

  return chrome("GB rail GTFS", `<h1>GB rail GTFS</h1>
<p class="lede">The British rail timetable, as GTFS, rebuilt every night.</p>

<a class="get" href="${DOWNLOAD}">Download gtfs.zip</a>

${status}

<p>That link always resolves to the most recent feed, so it can be bookmarked or
scripted against and will not need changing.</p>

<h2>What is in it</h2>
<p>Passenger rail, sleeper services, replacement buses and the ferries the timetable
carries, from the Rail Delivery Group's DTD feed.</p>

<p>A second feed, <a href="${DOWNLOAD_PASSING}">gtfs-passing-points.zip</a>, holds the same trips
and additionally says where each one runs through without stopping. <a href="using-this-data.html#what-you-get">Which
to take</a> depends on what you are doing with it.</p>

<p>Every feed is validated with the
<a href="https://github.com/MobilityData/gtfs-validator">MobilityData validator</a> before it is
published, and a build with a referential integrity error is never released.</p>

<h2>Using it</h2>
<p>The feed makes decisions a consumer cannot infer from the GTFS specification: identifiers,
splits and joins, service days, and the columns it adds.
<a href="using-this-data.html">Using this data</a> states them.</p>

<h2>Sources and licences</h2>
<dl>
  ${sources(feed)}
</dl>

<h2>Building it yourself</h2>
<p>The tool that produces this feed is open source and needs no database:</p>
<p><code>dtd2gtfs build --source RJTTFxxx.ZIP --out gtfs.zip</code></p>`);
}

/**
 * The guide, from the markdown it is written in. Prose belongs in a file that
 * reads as prose, rather than in a template literal in a build script.
 */
export function guide(feed: FeedMeta | undefined): string {
  const markdown = fs.readFileSync(path.join(__dirname, "..", "content", "using-this-data.md"), "utf8");

  return chrome("Using this data - GB rail GTFS", fill(markdown, feed));
}

async function main(): Promise<void> {
  const out = path.join(__dirname, "..", "public");
  const feed = await latestFeed();

  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, "index.html"), page(feed));
  fs.writeFileSync(path.join(out, "using-this-data.html"), guide(feed));

  console.log(`Wrote index.html and using-this-data.html to ${out}`);
}

// Only when run, not when imported. Importing this to test the pages it builds
// should not fetch the last release and rewrite public/.
if (require.main === module) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
