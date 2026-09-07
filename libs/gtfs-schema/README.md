# @gb-transit/gtfs-schema

The shape of a GTFS feed — one type per file, and the scalars they are written in.

```
npm install @gb-transit/gtfs-schema
```

Types only, near enough: an interface for every entity a feed publishes, a `Row` type for every file
it writes, three enums for the coded columns, and the two scalar modules the rest is expressed in.
It depends on nothing.

That is the point of it. [`@gb-transit/gtfs`](https://www.npmjs.com/package/@gb-transit/gtfs) holds
the transit model, the schedule transforms and the build, and to do the DTD's coordinates it pulls
in proj4; its calendar is typed against `Temporal`. A consumer that wants only the vocabulary — to
name the shape of a feed it is reading, or to agree with this project about what a duration is —
should not have to take any of that. So the vocabulary lives here and `@gb-transit/gtfs` re-exports
it, which means every name below is importable from either package and they cannot disagree.

## Usage

```ts
import {parseDuration, RouteType, type Stop, type StopTime} from "@gb-transit/gtfs-schema";

const seconds = parseDuration("25:30:00");   // 91800 - GTFS times are not capped at 24 hours
```

## What is in it

**Entities.** `Agency`, `Area`, `Attribution`, `Calendar`, `CalendarDate`, `FeedInfo`, `FixedLink`,
`Route`, `Stop`, `StopTime`, `Transfer`, `Trip`, and the `…Row` type each is written as. The two
differ where the build carries a field it does not publish: a `StopTime` knows its platform and
timing point, and `toStopTimeRow` in `@gb-transit/gtfs` turns those into the stop id.

`FeedRow` is the union of every row type, which is how the writers say what file they are given.

**Enums.** `RouteType`, `TransferType`, `PickupDropOffType`.

**Scalars.** `Duration` is seconds. `parseDuration` reads `"HH:MM"` or `"HH:MM:SS"` and does not cap
the hours, because GTFS uses `"25:30:00"` for a call after midnight; `formatDuration` writes one
back. `DayOfWeek` is Sunday-first — deliberately not `Temporal`'s ISO numbering, because the GTFS
calendar columns and the CIF schedule rows both start on Sunday. `compare`, `maxDate`, `minDate`,
`dayOfWeek` and `toYYYYMMDD` are the `Temporal.PlainDate` operations this project needs and Temporal
does not provide.

**Identifiers.** `TUID` and `RSID` are CIF names — train unique identifier and retail service
identifier — that end up on `trips.txt`, so `Trip` needs them.

## Two builds

This package publishes both CommonJS and ESM, unlike the rest of the repository, because
[`@gb-transit/gtfs-loader`](https://www.npmjs.com/package/@gb-transit/gtfs-loader) runs in a browser
and depends on it. Its imports carry explicit `.js` extensions for the same reason: node's ESM
loader requires them.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/gtfs-schema` in
that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
