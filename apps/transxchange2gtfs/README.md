transxchange2gtfs
=========================

transxchange2gtfs converts [transxchange](http://naptan.dft.gov.uk/transxchange/index.htm) timetable data into a [GTFS](https://developers.google.com/transit/gtfs/) zip.

## Current status

Non-functional, in development.

## Usage

**transxchange2gtfs requires [node 10.x](https://nodejs.org) or above**

transxchange2gtfs is a CLI tool that can be installed via NPM:

```
npm install -g transxchange2gtfs
```

It can be run by specifying the input and output files as CLI arguments:

```
transxchange2gtfs transxchange.xml gtfs.zip
```

Or using unix pipes:

```
cat transxchange.xml | transxchange2gtfs > gtfs.zip
```

## Notes

- All timezones are UTC
- Stop data is derived from [NapTAN](http://naptan.app.dft.gov.uk/datarequest/help)

## Contributing

Issues and PRs are very welcome. To get the project set up run

```
git clone git@github.com:planarnetwork/transxchange2gtfs
npm install --dev
npm test
```

If you would like to send a pull request please write your contribution in TypeScript and if possible, add a test.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

