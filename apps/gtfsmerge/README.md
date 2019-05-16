![gtfsmerge](logo.png)

[![Travis](https://img.shields.io/travis/planarnetwork/gtfsmerge.svg?style=flat-square)](https://travis-ci.org/planarnetwork/gtfsmerge) ![npm](https://img.shields.io/npm/v/gtfsmerge.svg?style=flat-square) ![David](https://img.shields.io/david/planarnetwork/gtfsmerge.svg?style=flat-square)

gtfsmerge merges multiple GTFS zip files into a single zip, adding transfers between geographically close stops.

- Duplicate stops, agencies and routes are assumed to be the same stop and only output once. 
- Calendars, calendar dates, trips and stop times are re-indexed. 
- Identical calendars are merged into a single entry. 
- Any calendars or calendar dates in the past are removed along with their corresponding trips
- Any calendar dates without a calendar are converted to a calendar
- This tool does not currently process any of the fares files. Please raise an issue if you would like this feature. 

## Installation

Please note that zip/unzip and [node 11.x](https://nodejs.org) or above are required.

gtfsmerge is a CLI tool that can be installed via NPM:

```
sudo apt-get install nodejs zip
npm install -g gtfsmerge
```

## Usage

It can be run by specifying the input and output files as CLI arguments:

```
gtfsmerge input1.zip input2.zip output.zip
```

You can specify the distance that should be used add transfers for nearby stops:

```
gtfsmerge --transfer-distance=0.06 input1.zip input2.zip output.zip
```
 
Stops with the same ID in different files are assumed to be the same stop but it is possible to add a prefix if this is not the case:

```
gtfsmerge --stop-prefix=input1_stop input1.zip modified-input1.zip
gtfsmerge modified-input1 input2.zip output.zip
```
 

## Contributing

Issues and PRs are very welcome. To get the project set up run

```
git clone git@github.com:planarnetwork/gtfsmerge
npm install --dev
npm test
```

If you would like to send a pull request please write your contribution in TypeScript and if possible, add a test.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

