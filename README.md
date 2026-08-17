![npm](https://img.shields.io/npm/v/dtd2mysql.svg?style=flat-square) ![npm](https://img.shields.io/npm/dw/dtd2mysql.svg?style=flat-square)

# GB rail DTD tooling

Tools for the British rail fares, routeing and timetable feeds: importing them into a
database, and converting the timetable to GTFS.

```
npm install -g dtd2mysql
dtd2mysql --timetable /path/to/RJTTFxxx.ZIP
dtd2mysql --gtfs-zip gtfs.zip
```

`dtd2gtfs` builds the same feed - byte for byte - straight from the DTD files with no database.
It is not published yet; run it from a clone with `yarn workspace dtd2gtfs run start build
--source RJTTF918.ZIP --out gtfs.zip`.

Full command line documentation: **[`apps/dtd2mysql`](apps/dtd2mysql/README.md)** for the importer,
**[`apps/dtd2gtfs`](apps/dtd2gtfs/README.md)** for the one-shot build.

## Packages

This is a monorepo. The published CLI is one workspace among several:

| Package | Published as | What it is |
|---|---|---|
| `apps/dtd2mysql` | `dtd2mysql` | Import the feeds into MySQL, and export GTFS from it |
| `apps/dtd2gtfs` | — | Build a GTFS feed straight from the DTD files, no database |
| `libs/feed-parser` | `@gb-transit/feed-parser` | Declarative fixed-width and CSV record parsing |
| `libs/dtd-schema` | `@gb-transit/dtd-schema` | Record layouts for the fares, timetable, routeing and NFM64 feeds |
| `libs/dtd-source` | `@gb-transit/dtd-source` | SFTP download and feed sequencing |
| `libs/gtfs` | `@gb-transit/gtfs` | GTFS entities, the transit model, the transforms and the build |
| `libs/gtfs-output` | `@gb-transit/gtfs-output` | Writers: a directory of text files, or a zip |

The libraries are published under `@gb-transit` and `dtd2mysql` depends on them the way any
other consumer would, so a GTFS build that reads from something other than this tool's MySQL
schema needs `@gb-transit/gtfs` and not the CLI. `dtd2gtfs` is not published yet.

Libraries never depend on an app. Each package builds to its own `dist/` and the
workspaces resolve to that output, so `yarn build` has to happen before anything runs;
`tsc -b` walks the project references and makes it incremental.

Where this is going, and why it is shaped like this, is written up in
[`docs/restructure.md`](docs/restructure.md).


## Contributing

Issues and PRs are very welcome. To get the project set up run

```
git clone git@github.com:planarnetwork/dtd2mysql
yarn install
yarn test
```

Anything that should reach a user needs a changeset: run `yarn changeset`, pick the bump
type, and commit the file it writes. A pull request with no changeset publishes nothing,
which is the right answer for documentation and CI changes.

If you would like to send a pull request please write your contribution in TypeScript and
if possible, add a test.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
