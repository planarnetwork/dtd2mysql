# @gb-transit/website

The download page for the GB rail GTFS feed.

Not published to npm. It is built and deployed to GitHub Pages by
[`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) whenever this directory changes
or a new feed is released.

```
yarn workspace @gb-transit/website run build
```

That writes `apps/website/public`, which is what the Pages workflow uploads.

## How it works

No framework. Four static pages with no client-side behaviour do not need a build system, and one
would be a dependency to keep current for the rest of the project's life. `src/build.ts` reads the
metadata published alongside the latest feed release and writes the HTML.

Everything the page claims — when the feed was built, which DTD feed it came from, how many trips it
holds, the window it covers and the sources it credits — is read from the published feed rather than
written into the page, so it cannot drift from what was actually built. When nothing has been
published the page says so instead of inventing numbers.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `apps/website` in
that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
