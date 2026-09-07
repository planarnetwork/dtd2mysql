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
carries, and the source list that must never be empty. Run with the rest of the repository:

```
yarn vitest run --project @gb-transit/website
```

## Contributing

Issues, pull requests and the source live at
[planarnetwork/gb-transit](https://github.com/planarnetwork/gb-transit). This is `apps/website` in
that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
