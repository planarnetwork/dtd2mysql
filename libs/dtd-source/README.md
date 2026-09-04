# @gb-transit/dtd-source

Download and sequencing of the DTD feed files from the RSP SFTP server, and a timetable source that
reads them directly.

```
npm install @gb-transit/dtd-source
```

Two jobs that both sit between the RSP's files and everything downstream: fetching the zips, and
presenting the timetable inside them as a `TimetableSource` that
[`@gb-transit/gtfs`](https://www.npmjs.com/package/@gb-transit/gtfs) can build a feed from. The
second is what lets a GTFS build run with no database in it.

## Sequencing a feed

The DTD timetable is published as a weekly full refresh (`RJTTFxxx.ZIP`) followed by daily
incrementals (`RJTTCxxx.ZIP`). They have to be applied in publication order, starting from the most
recent refresh — anything before it is superseded.

```ts
import {timetableFeeds} from "@gb-transit/dtd-source";

const sources = timetableFeeds(["./feeds"]);
```

Given a directory this picks out the timetable zips, orders them by sequence number and drops
everything before the latest full refresh. Files and directories can be mixed, and the fares,
routeing and NFM64 zips sitting alongside are ignored.

This is deliberately not a filename sort: as text every `RJTTC` sorts before every `RJTTF`, which
would apply the incrementals before the refresh that supersedes them.

## Reading the timetable

`CifFileSource` implements `TimetableSource` over those zips:

```ts
import {CifFileSource, timetableFeeds} from "@gb-transit/dtd-source";
import {BuildFeed, buildContext, dateRange, stationCoordinates} from "@gb-transit/gtfs";
import {FileOutput} from "@gb-transit/gtfs-output";

const context = buildContext(process.argv, process.env);

const feed = new BuildFeed(
  new CifFileSource(timetableFeeds(["./feeds"]), stationCoordinates, dateRange(context)),
  new FileOutput(),
  context
);

await feed.build("./gtfs");
```

It is built for one window, given by `dateRange`, and exposes the stations, schedules, associations
and fixed links within it.

## Downloading

`DownloadCommand`, `DownloadFileCommand` and `DownloadAndProcessCommand` fetch from the RSP SFTP
server, and `PromiseSFTP` is the promise wrapper they use. `FeedCursor` records how far through a
feed a consumer has got, so the next run takes the incrementals it has not seen; `NO_CURSOR` starts
from the most recent full refresh.

```ts
import {NO_CURSOR, PromiseSFTP} from "@gb-transit/dtd-source";
```

Credentials are the ones issued by the RSP for the DTD feeds.

## Requirements

Node.js 26 or later. Date handling uses the built-in `Temporal` API, which is only available as a
global from Node 26 onwards.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/dtd-source`
in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
