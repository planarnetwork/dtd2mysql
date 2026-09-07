# @gb-transit/gtfs-loader

Read a GTFS feed — a zip, a stream, a `Response` or the bytes — as rows, or as a timetable.

```
npm install @gb-transit/gtfs-loader
```

The rest of this repository writes GTFS feeds. This reads them, and it reads any feed rather than
only the ones written here. It parses as the bytes arrive instead of after they have all been
collected, so the source can be whatever the environment can give bytes from: a file stream in node,
a `fetch` response in a browser, or a `Uint8Array` you already have. The GB rail feed — 21 MB, 292
thousand trips, three million stop times — loads in under three seconds.

It was written for [raptor](https://github.com/planarnetwork/raptor), a journey planner, and it
still carries the shape that planner needs: `normalise` resolves platforms to the stations a
passenger changes at, and `linkTrips` turns a `transfer_type: 4` coupling into the through trip a
passenger actually stays on. That last part closes a loop with `@gb-transit/gtfs`, which writes
exactly the rows this reads back.

## Two ways to read

```ts
// What a journey planner plans over: times as seconds, calls indexed by stop,
// couplings resolved. Lossy on purpose - six of the ten columns of
// stop_times.txt, seven of the files.
const timetable = await loadGTFS(fs.createReadStream("gtfs.zip"));

// The rows as they were written: every file, every column, values as the file
// held them. What a tool that rewrites a feed needs.
const rows = await loadGTFS(fs.createReadStream("gtfs.zip"), {raw: true});
rows["stops.txt"][0].stop_code;

// Or a file at a time, for a feed whose stop_times.txt is three million rows -
// holding them to index them holds them twice.
await readFeed(fs.createReadStream("gtfs.zip"), {
  "stops.txt": stop => index(stop)
});
```

`{raw: true, files: [...]}` reads only what you ask for; nothing else is
decompressed.

## Usage

```ts
import {loadGTFS, loadGTFSFromUrl, normalise} from "@gb-transit/gtfs-loader";
import * as fs from "node:fs";

const feed = await loadGTFS(fs.createReadStream("gtfs.zip"));

console.log(feed.trips.length, Object.keys(feed.stops).length);

// the feed as a planner wants it: stops resolved to stations, unboardable trips dropped,
// couplings turned into through trips
const timetable = normalise(feed);
```

`loadGTFSFromUrl` fetches and parses in one pass. In a browser the feed has to be readable by the
page, which means same origin or an `Access-Control-Allow-Origin` header — most GTFS publishers send
neither, so expect to proxy or to host the feed yourself. `GTFSFetchError` says so when that is what
went wrong, because a browser's CORS refusal is a bare `TypeError` that explains nothing.

Pass `onProgress` in the options to follow a long load. The parts are exported too — `readZip`,
`CSVParser`, `entityTypeOf`, `FeedBuilder` — for a caller that wants to read a feed some other way.

## The names collide with `@gb-transit/gtfs`, on purpose

`Stop`, `StopTime`, `Trip`, `Transfer`, `Calendar`, `TripLink`, `StopID` and `FeedInfo` are exported
by both packages and mean different things in each. That is not an oversight and they should not be
merged.

`@gb-transit/gtfs`'s are the rows a GB rail feed is *written* as: times are strings, `pickup_type` is
a four-valued code, a stop carries a CRS and a TIPLOC, `location_type` is narrowed to `0 | 1`
because the build only publishes stations and boarding points. These are what any feed is *read*
into: times are seconds from midnight, `pickUp` is a boolean because a planner can only board or
not, `locationType` is a `number` because an arbitrary feed has entrances and boarding areas too.

The two `LinkedTrips` modules are the clearest case — they are inverse operations. `@gb-transit/gtfs`
writes the `transfer_type: 4` rows; this reads them and joins the trips they couple.

What the two packages *do* share is the vocabulary underneath, which they take from
`@gb-transit/gtfs-schema` so they cannot drift: a `Duration` is seconds, a `DayOfWeek` is
Sunday-first, and a time string is read by one `parseDuration`.

## Two builds

This package publishes both CommonJS and ESM, unlike the rest of the repository, because it runs in
a browser as well as in node. Three things follow from that, all of them deliberate:

- **Its imports carry explicit `.js` extensions.** Node's ESM loader will not resolve a specifier
  without one. Do not take them off.
- **`sideEffects: false`**, so a bundler can drop the half it does not use.

## Two feeds it will refuse

**A blank `arrival_time` or `departure_time`** is valid GTFS for a stop the feed gives no time for.
This does not handle one: `FeedBuilder` reads every call's times unconditionally and `TimeParser`
throws on a string it cannot parse, so a feed containing one fails to load. That is a change from
throwing nothing and carrying `NaN` times through into planned journeys, which was worse, but it is
not yet the right answer — deciding what a missing time should mean is its own question. The GB
rail feed has no such rows.

**Two stations sharing a `stop_code`.** `normalise` throws. GTFS puts no uniqueness requirement on
`stop_code`, so this is stricter than the specification, and it is deliberate: `stop_code` is the
identifier journeys are planned between, so two stations sharing one would be planned as the same
place. Falling back to `stop_id` would quietly merge two real stations, which is a wrong answer
rather than a refusal. Platforms sharing their station's code are fine — they resolve to it through
`parent_station` before the check.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/gtfs-loader` in
that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
