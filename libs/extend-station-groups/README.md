# @gb-transit/extend-station-groups

RDG group stations as GTFS Fares v2 `areas.txt` and `stop_areas.txt`.

```
npm install @gb-transit/extend-station-groups
```

An `Extension` for [`@gb-transit/gtfs`](https://www.npmjs.com/package/@gb-transit/gtfs). The fares
feed defines group stations — "London Terminals", "Manchester Stations" — sets of stations a ticket
treats as one place. GTFS Fares v2 has exactly the right shape for that in `areas.txt` and
`stop_areas.txt`, so this reads the groups out of the fares feed and publishes them.

An extension, rather than an enricher, because it contributes whole files the core build has no
concept of instead of filling in fields on entities that already exist.

## Usage

```ts
import {STATION_GROUPS, StationGroupsExtension, groupsFromFeed} from "@gb-transit/extend-station-groups";
import {BuildFeed} from "@gb-transit/gtfs";

const feed = new BuildFeed(source, output, context, [], [
  new StationGroupsExtension(groupsFromFeed("./feeds"), context.today.toString())
]);
```

`groupsFromFeed` takes the fares feed — a `RJFAFxxx.ZIP`, or a directory holding one. A fares
refresh is published alongside the timetable refresh, so when a build reads a directory the groups
are already there.

## Why it needs the build date

58 groups have more than one date range. Without a date to select on there is no single answer to
what a group contains, and `area_id` comes out duplicated. Passing the date the feed is built for
resolves each group to the membership in force on that day.

## Output

`areas.txt` and `stop_areas.txt`, keyed on `area_id` and on `(area_id, stop_id)`. Attribution is
declared by the extension and published in `attributions.txt`: the data is the Rail Delivery Group's
under the Rail Settlement Plan licence, which is not share-alike.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is
`libs/extend-station-groups` in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
