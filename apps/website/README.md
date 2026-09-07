# @gb-transit/website

The site for the GB rail GTFS feed: a download page, and a guide to the decisions the feed makes
that a consumer cannot infer from the GTFS specification.

Not published to npm. It is built and deployed to GitHub Pages by
[`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) whenever this directory changes
or a new feed is released.

```
yarn workspace @gb-transit/website run build
```

That writes `apps/website/public`, which is what the Pages workflow uploads.

## How it works

No framework. A couple of static pages with no client-side behaviour do not need a build system,
and one would be a dependency to keep current for the rest of the project's life. `src/build.ts`
reads the metadata published alongside the latest feed release and writes the HTML.

Everything the pages claim — when the feed was built, which DTD feed it came from, how many trips it
holds, the window it covers and the sources it credits — is read from the published feed rather than
written into the page, so it cannot drift from what was actually built. When nothing has been
published the pages say so instead of inventing numbers.

| | |
|---|---|
| `index.html` | the download page, written as HTML in `src/build.ts` |
| `using-this-data.html` | the guide, written as markdown in `content/using-this-data.md` |

The guide is prose, so it lives in a file that reads as prose and is compiled with
[marked](https://marked.js.org/). It carries `{{token}}` placeholders for the few things that come
from the published feed — the figures and the source list. They are substituted after the markdown
is rendered, so anything external reaches the page through `escape()` rather than through a
markdown parser that passes HTML through by design, and a token nothing supplies fails the build
rather than being published as it is.

Everything else in the guide is described by shape rather than by count. A figure measured against a
refresh from six months ago rots in silence and nothing here would catch it.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `apps/website` in
that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
