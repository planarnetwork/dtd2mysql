# @gb-transit/website

The site for the GB rail GTFS feeds and the tools that build them:
[planarnetwork.github.io/gb-transit](https://planarnetwork.github.io/gb-transit/).

Not published to npm. It is built and deployed to GitHub Pages by
[`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) whenever this directory changes
or a new feed is released.

```
yarn workspace @gb-transit/website run build   # writes apps/website/dist
yarn workspace @gb-transit/website run dev     # localhost:4321/gb-transit
```

## The site

| | |
|---|---|
| `/` | what the feeds are, and which one to take |
| `/feeds/` | the three feeds in detail, and how one gets published |
| `/feeds/explorer/` | open the feed and look inside it |
| `/feeds/using-this-data/` | the decisions the feeds make that GTFS does not |
| `/tools/` | the four tools, and how they compose |
| `/tools/{cif2gtfs,dtd2mysql,transxchange2gtfs,gtfsmerge}/` | one page each |

`public/using-this-data.html` keeps the URL the guide had before the redesign working. It is
written by hand rather than configured: Astro's `redirects` emits a directory for a key ending
`.html` and drops the base path from the destination, so it produces neither the URL that was
published nor one that resolves.

## How it works

[Astro](https://astro.build), building to static HTML with no client-side JavaScript. The site is
served from a project page, so `base` in [`astro.config.mjs`](astro.config.mjs) is `/gb-transit` and
every absolute link carries it; the prose pages link relatively so they do not have to know.

Fonts are fetched at build time and served from this origin. A download page that reports what the
feed contains should not make its readers announce themselves to a third party to read it.

### The explorer is the exception

[`/feeds/explorer/`](src/pages/feeds/explorer.astro) is the one page here that ships JavaScript. The
rule exists so that reading about the feed costs nothing and depends on nothing; the explorer is not
reading about the feed, it is the feed. The alternative is a server that holds a 21 MB zip and
answers questions about it — something to run, to pay for, and to trust with what its users are
looking at. Doing it in the reader's own browser keeps the promise the rest of the site makes:
nothing about you leaves this origin unless you ask it to, which is why a station draws its own plot
and the map is a button that says what pressing it does. It is about 30 KB gzipped over two chunks,
on one page, and no other page loads a byte of it.

[`src/explorer/`](src/explorer) is laid out so that almost none of it is about the DOM.
`model/` reads a zip into memory, `query/` filters it, `checks/` asks questions of it and `worker/`
answers them off the main thread — all of it plain, testable TypeScript. `ui/` is the only part that
builds HTML, and each view there is a function from a value to a string. That boundary is what
stands in for a framework.

The parse runs in a Web Worker because on the published feed it is a few seconds of solid CPU, which
on the main thread is a frozen page. One consequence worth knowing: the explorer is bundled twice, so
a type imported without the word `type` breaks the worker build rather than the type check — which is
why this workspace sets `verbatimModuleSyntax`.

A feed opens in one pass, `stop_times.txt` included, behind a loading screen that says which file it
is reading and how far through it is. That file is 181 MB of the 202 and 2.9 million of the 3.3
million rows, so it dominates the wait — but it is not a different kind of thing and it does not load
like one. It was a second, opt-in phase once, on the grounds that it costs a few seconds and a few
hundred megabytes. That was wrong twice over: half of what the explorer does needs those rows, so the
tool did not work until you had found a button and understood why it was there; and "some of the feed
is open" was a state every view had to know about, which is where two of the three shipped bugs came
from.

It is still *held* differently — see `model/CallStore.ts`, where 2.9 million rows are six typed
arrays at 55 MB rather than row objects at 893 MB. That difference is what makes the feed something a
browser can hold at all, and it is invisible from outside the model.

### What the explorer reads

The feed, and the sidecars the nightly publishes beside it. `validation.json` is the MobilityData
validator's report, shown against the accepted errors in
[`.github/validator-baseline.json`](../../.github/validator-baseline.json) so that a deliberate
decision reads as one rather than as a failure. `provenance.json` is the enrichment ledger — every
value a source wrote and every write that lost — which is what makes "this station is in the wrong
place" answerable. Both are mirrored into `public/` by the Pages workflow, like the feed, and a
release that carries neither leaves those views saying so.

### Nothing about the feed is written into a page

[`src/feed.ts`](src/feed.ts) fetches `feed-meta.json` from the latest release once per build, and
every component that describes a feed asks it. When the feed was built, which DTD refresh it came
from, how many trips and stop times each zip holds, the window it covers and the sources it credits
are all read rather than stated, so they cannot drift from what was actually built.

That is also how the site handles a feed that does not exist yet. `FEEDS` in the same file lists
all three zips, and each one asks the release whether it is in it. A feed the release does not carry
renders as a platform with nothing announced on it rather than as a download button on a 404 — which
is the state `gtfs-national-rail-only.zip` is in until the build that produces it reaches master.
Nothing has to be edited here when it does.

When no feed has been published at all, or the build cannot reach the network, the pages say so
instead of inventing numbers. A site that builds offline is worth more than one that fails.

### Prose is markdown

The guide and the tool pages are MDX under [`src/pages`](src/pages), so prose lives in a file that
reads as prose. Where a page needs something from the release it uses a component — `<FeedTable />`,
`<FeedFigures />`, `<Sources />` — rather than a placeholder a substitution pass has to find. An
unknown component is a build error, which is the guarantee the old `{{token}}` scheme was hand
rolling.

Everything else in the guide is described by shape rather than by count. A figure measured against a
refresh from six months ago rots in silence and nothing here would catch it.

[`src/markdown.mjs`](src/markdown.mjs) adds the two things the markdown pipeline does not do: a
table wider than the screen scrolls inside its own box rather than taking the page with it, and
every `h2` and `h3` gets an anchor. It assigns the heading id as well as the anchor, because a user
plugin runs before Astro's own and so cannot read the id Astro is about to assign.

## Tests

`src/feed.spec.ts` covers the data layer — which feeds a release describes, which figures it
carries, and the source list that must never be empty. `src/explorer/**` covers the explorer's model,
queries and checks against the golden feed cif2gtfs is held to. Run with the rest of the repository:

```
yarn vitest run --project @gb-transit/website
```

### The explorer also has a browser check

Three faults reached the published page that none of the above could have caught: a button that was
live before there was a feed to press it against, a progress bar that was never cleared, and a set of
findings that were dropped on the way back from the worker so every check reported finding nothing.
All three are only visible to something that opens the page and clicks.

[`test/explorer.browser.mts`](test/explorer.browser.mts) does that. It is not part of
`yarn vitest run` — it needs a built site, the feed beside it, and a browser, none of which CI has —
so it is named `.browser.mts` rather than `.spec.mts` and run by hand before publishing:

```
cp data/gtfs.zip apps/website/public/            # the Pages workflow does this from the release
yarn workspace @gb-transit/website run build
node --experimental-strip-types apps/website/test/explorer.browser.mts
```

It drives the Chrome already on the machine rather than downloading another, and it asserts what the
checks *find* rather than only that they finish — the third fault passed a test that did the latter.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/gb-transit](https://github.com/planarnetwork/gb-transit). This is `apps/website` in
that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
