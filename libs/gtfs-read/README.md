# @gb-transit/gtfs-read

Read a GTFS feed as the rows it was written as.

```
npm install @gb-transit/gtfs-read
```

[`@gb-transit/gtfs-loader`](../gtfs-loader) reads a feed into what a journey planner plans over:
times as seconds, calls indexed by stop, six of the ten columns of `stop_times.txt`, seven of the
files. This reads the other direction — every file it knows, every column, values as the file held
them — so a tool that rewrites a feed can put back what it took out. It is built out of that
package's parts, so there is no second CSV parser and no second zip reader here.

## Usage

```ts
import {readFeed, readFeedRows} from "@gb-transit/gtfs-read";
import * as fs from "node:fs";

// Row by row. Only the files with a handler are decompressed.
await readFeed(fs.createReadStream("gtfs.zip"), {
  "stops.txt": stop => console.log(stop.stop_id, stop.stop_name),
  "trips.txt": trip => console.log(trip.trip_id)
});

// Or all of it at once.
const {["stops.txt"]: stops} = await readFeedRows(fs.createReadStream("gtfs.zip"), ["stops.txt"]);
```

**The row object is reused between rows.** It is reading a file that may be three million rows and
does not allocate one per row, so copy out what you keep.

## What it does and does not coerce

The columns that are genuinely numbers come back as numbers; everything else comes back as the text
the file held. Coordinates are deliberately text: a stop that arrived as `51.50740` would come back
as `51.5074` and re-serialise a digit short.

An empty field is `undefined`, which is what [`@gb-transit/gtfs-output`](../gtfs-output) writes an
absent value from. That pair is the round trip — reading a feed and writing it out again produces
the same bytes — and `tests` holds every feed this repository commits to it.
