
![npm](https://img.shields.io/npm/v/dtd2mysql.svg?style=flat-square) ![npm](https://img.shields.io/npm/dw/dtd2mysql.svg?style=flat-square) 


An import tool for the British rail fares, routeing and timetable feeds into a database.

Although both the timetable and fares feed are open data you will need to obtain the fares feed via the [ATOC website](http://data.atoc.org/fares-data). The formal specification for the data inside the feed also available on the [ATOC website](http://data.atoc.org/sites/all/themes/atoc/files/SP0035.pdf).

At the moment only MySQL compatible databases are supported but it could be extended to support other data stores. PRs are very welcome.

## Requirements

Node.js 26 or later. Date handling uses the built-in `Temporal` API, which is only available as a global
from Node 26 onwards.

## Download / Install

You don't have to install it globally but it makes it easier if you are not going to use it as part of another project. The `-g` option usually requires `sudo`. It is not necessary to git clone this repository unless you would like to contribute.

```
npm install -g dtd2mysql
```

## Fares 

Each of these commands relies on the database settings being set in the environment variables. For example `DATABASE_USERNAME=root DATABASE_NAME=fares dtd2mysql --fares-clean`.

### Import

Import the fares into a database, creating the schema if necessary. This operation is destructive and will remove any existing data.

```
dtd2mysql --fares /path/to/RJFAFxxx.ZIP
```
### Clean 

Removes expired data and invalid fares, corrects railcard passenger quantities, adds full date entries to restriction date records. This command will occasionally fail due to a MySQL timeout (depending on hardware), re-running the command should correct the problem.

```
dtd2mysql --fares-clean
```
## Timetables
### Import

Import the timetable information into a database, creating the schema if necessary. This operation is destructive and will remove any existing data.

```
dtd2mysql --timetable /path/to/RJTTFxxx.ZIP
```

### Convert to GTFS

Convert the DTD/TTIS version of the timetable (up to 3 months into the future) to GTFS. 

```
dtd2mysql --timetable /path/to/RJTTFxxx.ZIP
dtd2mysql --gtfs-zip filename-of-gtfs.zip
```

## Routeing Guide
### Import
```
dtd2mysql --routeing /path/to/RJRGxxxx.ZIP
# optional
dtd2mysql --nfm64 /path/to/nfm64.zip 
```

## Download from SFTP server

The download commands will take the latest full refresh from an SFTP server (by default the DTD server).

Requires the following environment variables:

```
SFTP_USERNAME=dtd_username
SFTP_PASSWORD=dtd_password
SFTP_HOSTNAME=dtd_hostname (this will default to dtd.atocrsp.org)
```

There is a command for each feed

```
dtd2mysql --download-fares /path/
dtd2mysql --download-timetable /path/
dtd2mysql --download-routeing /path/
dtd2mysql --download-nfm64 /path/
```

Or download and process in one command

```
dtd2mysql --get-fares
dtd2mysql --get-timetable
dtd2mysql --get-routeing
dtd2mysql --get-nfm64
```

## Notes
### null values

Values marked as all asterisks, empty spaces, or in the case of dates - zeros, are set to null. This is to preverse the integrity of the column type. For instance a route code is numerical although the data feed often uses ***** to signify any so this value is converted to null. 

### keys
Although every record format has a composite key defined in the specification an `id` field is added as the fields in the composite key are sometimes null. This is no longer supported in modern versions of MariaDB or MySQL.

### missing data
At present journey segments, class legends, rounding rules, print formats  and the fares data feed meta data are not imported. They are either deprecated or irrelevant. Raise an issue or PR if you would like them added.

### timetable format

The timetable data does not map to a relational database in a very logical fashion so all LO, LI and LT records map to a single `stop_time` table.

### GTFS feed cutoff date

Only schedule records that **start** up to 3 months into the future (using date of import as a reference point) are exported to GTFS for performance reasons.
This will cause any data after that point to be either incomplete or incorrect, as override/cancellation records after that will be ignored as well.

## Contributing

Issues and PRs are very welcome. To get the project set up run

```
git clone git@github.com:planarnetwork/dtd2mysql
yarn install
yarn test
```

Yarn 4 is used and its release bundle is committed, so there is nothing to install
first - `yarn` works straight after a clone as long as Node 26 is on the path.

### Repository layout

This is a monorepo. The published CLI is one workspace among several:

```
apps/dtd2mysql        the CLI - published as `dtd2mysql`
libs/feed-parser      declarative fixed-width and CSV record parsing
libs/dtd-schema       the record layouts for the four DTD feeds
libs/dtd-source       SFTP download and feed sequencing
libs/gtfs             GTFS entities, the transit model, the transforms and the build
libs/gtfs-output      writers: a directory of text files, or a zip
```

Libraries publish under the `@gb-rail` scope and never depend on an app. Each
package builds to its own `dist/` and workspaces resolve to that output, so
`yarn build` (or any script that runs code) has to happen before the CLI will
start; `tsc -b` makes it incremental.

If you would like to send a pull request please write your contribution in TypeScript and if possible, add a test.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
