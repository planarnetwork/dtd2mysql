transxchange2gtfs
=========================

[![Travis](https://img.shields.io/travis/planarnetwork/transxchange2gtfs.svg?style=flat-square)](https://travis-ci.org/planarnetwork/transxchange2gtfs) ![npm](https://img.shields.io/npm/v/transxchange2gtfs.svg?style=flat-square)  
![David](https://img.shields.io/david/planarnetwork/transxchange2gtfs.svg?style=flat-square)

transxchange2gtfs converts [TransXChange](http://naptan.dft.gov.uk/transxchange/index.htm) timetable data into a [GTFS](https://developers.google.com/transit/gtfs/) zip.

## Current status

Non-functional, in development.

## Usage

**please note that [node 10.x](https://nodejs.org) or above is required**

transxchange2gtfs is a CLI tool that can be installed via NPM:

```
npm install -g transxchange2gtfs
```

It can be run by specifying the input and output files as CLI arguments:

```
transxchange2gtfs transxchange1.xml transxchange2.xml gtfs-output.zip
```

Or using zip files:

```
transxchange2gtfs multiple-transxchange-files.zip another-transxchange-package.zip single-transxchange.xml gtfs-output.zip
```

## Notes

- All timezones are UTC
- Stop data is derived from [NaPTAN](http://naptan.app.dft.gov.uk/datarequest/help)


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

