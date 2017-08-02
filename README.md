# dtd2mysql [![Build Status](https://travis-ci.org/open-track/dtd2mysql.svg?branch=master)](https://travis-ci.org/open-track/dtd2mysql)

A import the British rail fares, routeing and timetable feeds into a database.

Although both the timetable and fares feed are open data you will need to obtain the fares feed via the [ATOC website](http://data.atoc.org/fares-data). The formal specification for the data inside the feed also available on the [ATOC website](http://data.atoc.org/sites/all/themes/atoc/files/SP0035.pdf).

At the moment only MySQL compatible databases are supported but it could be extended to support other data stores. PRs are very welcome.

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
dtd2mysql --timetable /path/to/RJTAFxxx.ZIP
```

### Convert to GTFS

Convert the DTD/TTIS version of the timetable to GTFS. 

```
dtd2mysql --timetable /path/to/RJTAFxxx.ZIP
dtd2mysql --gtfs-zip filename-of-gtfs.zip
```

## Routeing Guide
### Import
```
dtd2mysql --routeing /path/to/RJRGxxxx.ZIP
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

## Contributing

Issues and PRs are very welcome. To get the project set up run

```
git clone git@github.com:open-track/dtd2mysql
npm install --dev
npm test
```

If you would like to send a pull request please write your contribution in TypeScript and if possible, add a test.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
