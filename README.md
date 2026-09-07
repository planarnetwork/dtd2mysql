![npm](https://img.shields.io/npm/v/dtd2mysql.svg?style=flat-square) ![npm](https://img.shields.io/npm/dw/dtd2mysql.svg?style=flat-square)

# GB rail DTD tooling

Tools for the DTD feeds the Rail Delivery Group publishes — the CIF timetable, the fares feed and
the routeing guide. They do two things: import the feeds into a MySQL database, and turn the CIF
timetable into GTFS.

The repository also builds and publishes that GTFS feed nightly.

## The published feed

If you want the data rather than the tools, you do not need to run anything:

**[planarnetwork.github.io/dtd2mysql](https://planarnetwork.github.io/dtd2mysql)** — the download
page, with the coverage window and what the current feed was built from.

| | |
|---|---|
| [`gtfs.zip`](https://github.com/planarnetwork/dtd2mysql/releases/latest/download/gtfs.zip) | where a service calls |
| [`gtfs-passing-points.zip`](https://github.com/planarnetwork/dtd2mysql/releases/latest/download/gtfs-passing-points.zip) | and where it runs through without stopping |

Both are rebuilt every night by [`feed.yml`](.github/workflows/feed.yml) from the configuration in
[`gtfs.config.yaml`](gtfs.config.yaml), validated against a
[pinned baseline](.github/validator-baseline.json), and attached to a dated release. A build that
fails validation is not published.

The feed makes decisions a consumer cannot infer from the GTFS specification — identifiers, splits
and joins, service days, the columns it adds.
**[Using this data](https://planarnetwork.github.io/dtd2mysql/using-this-data.html)** states them.
Its source is [`apps/website/content/using-this-data.md`](apps/website/content/using-this-data.md).

## The tools

```
npm install -g dtd2mysql
dtd2mysql --timetable /path/to/RJTTFxxx.ZIP
dtd2mysql --gtfs-zip gtfs.zip
```

`cif2gtfs` builds the same feed — byte for byte — straight from the feed files with no database:

```
npm install -g cif2gtfs
cif2gtfs build --source RJTTF918.ZIP --out gtfs.zip
```

Full command line documentation is in each app's README:
**[`apps/dtd2mysql`](apps/dtd2mysql/README.md)** for the importer,
**[`apps/cif2gtfs`](apps/cif2gtfs/README.md)** for the one-shot build.

## Packages

This is a monorepo. The published CLI is one workspace among several, and every package has a
README describing what it is for and how to use it.

### Applications

| Package | Published as | What it is |
|---|---|---|
| [`apps/dtd2mysql`](apps/dtd2mysql/README.md) | `dtd2mysql` | Import the feeds into MySQL, and export GTFS from it |
| [`apps/cif2gtfs`](apps/cif2gtfs/README.md) | `cif2gtfs` | Build a GTFS feed straight from the feed files, no database |
| [`apps/website`](apps/website/README.md) | — | The download page and the guide, deployed to GitHub Pages |

### Libraries

| Package | Published as | What it is |
|---|---|---|
| [`libs/gtfs-schema`](libs/gtfs-schema/README.md) | `@gb-transit/gtfs-schema` | The shape of a GTFS feed: one type per file, and the scalars they are written in |
| [`libs/feed-parser`](libs/feed-parser/README.md) | `@gb-transit/feed-parser` | Declarative fixed-width and CSV record parsing |
| [`libs/dtd-schema`](libs/dtd-schema/README.md) | `@gb-transit/dtd-schema` | Record layouts for the fares, timetable, routeing guide and NFM64 feeds |
| [`libs/dtd-source`](libs/dtd-source/README.md) | `@gb-transit/dtd-source` | SFTP download, feed sequencing, and a timetable source that reads the files directly |
| [`libs/gtfs`](libs/gtfs/README.md) | `@gb-transit/gtfs` | GTFS entities, the transit model, the transforms and the build |
| [`libs/gtfs-output`](libs/gtfs-output/README.md) | `@gb-transit/gtfs-output` | Writers: a directory of text files, or a zip |
| [`libs/enrich-naptan`](libs/enrich-naptan/README.md) | `@gb-transit/enrich-naptan` | Station coordinates and names from NaPTAN |
| [`libs/extend-station-groups`](libs/extend-station-groups/README.md) | `@gb-transit/extend-station-groups` | Group stations as GTFS Fares v2 areas |

`libs/gtfs` carries two extension points, so a source of data this repository does not know about
can be added without changing the build: an `Enricher` writes fields on entities the timetable
produced, and an `Extension` contributes whole files. `enrich-naptan` and `extend-station-groups`
are the two implementations, and they are the worked examples.

`dtd2mysql` depends on the libraries the way any other consumer would, so a GTFS build reading from
something other than this tool's MySQL schema needs `@gb-transit/gtfs` rather than the CLI.

Libraries never depend on an app. Each package builds to its own `dist/` and the workspaces resolve
to that output, so `yarn build` has to happen before anything runs; `tsc -b` walks the project
references and makes it incremental.

## Also in here

| | |
|---|---|
| [`data/README.md`](data/README.md) | The reference feeds, how they are fetched and fingerprinted, and which baseline came from which feed |
| [`docs/restructure.md`](docs/restructure.md) | Where this is going and why it is shaped like this |
| [`docs/station-names.md`](docs/station-names.md) | Where NaPTAN and the override table disagree about a station's name |
| [`docs/coordinate-review.md`](docs/coordinate-review.md) | Stations whose two coordinate sources differ by more than 100 m |
| [`apps/cif2gtfs/fixtures/BASELINE.md`](apps/cif2gtfs/fixtures/BASELINE.md) | Why the committed output last changed, entry by entry |

## Contributing

Issues and pull requests are very welcome. To get set up:

```
git clone git@github.com:planarnetwork/dtd2mysql
yarn install
yarn test
```

Node 26, as [`.nvmrc`](.nvmrc) pins it.

[`apps/cif2gtfs/fixtures/mini`](apps/cif2gtfs/fixtures/mini) holds a small slice of a real feed and
the GTFS it produces, committed as text. The test suite builds it and diffs, so a change in the
feed's behaviour shows up in review as a readable diff rather than as a hash that moved. To take a
change, run `UPDATE_GOLDEN=1 yarn vitest run`, read the diff, and record why it moved in
[`BASELINE.md`](apps/cif2gtfs/fixtures/BASELINE.md) — CI requires an entry.

Anything that should reach a user needs a changeset: run `yarn changeset`, pick the bump type, and
commit the file it writes. A pull request with no changeset publishes nothing, which is the right
answer for documentation and CI changes.

Please write contributions in TypeScript and, if possible, add a test.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
