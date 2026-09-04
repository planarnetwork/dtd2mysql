# @gb-transit/dtd-schema

Declarative record layouts for the DTD fares, timetable, routeing guide and NFM64 feeds.

```
npm install @gb-transit/dtd-schema
```

The RSP publishes four feeds as zips of flat text files, each file a different fixed-width or
delimited layout. This package is those layouts, written as data: which columns a record has, where
they sit, what type each one is and which of them form its key.

It is the layouts only. Parsing them is
[`@gb-transit/feed-parser`](https://www.npmjs.com/package/@gb-transit/feed-parser); downloading the
feeds is [`@gb-transit/dtd-source`](https://www.npmjs.com/package/@gb-transit/dtd-source).

## Usage

The default export holds one specification per feed, keyed by the file extension inside the zip:

```ts
import schema from "@gb-transit/dtd-schema";

const MSN = schema.timetable["MSN"];   // station names and coordinates
const MCA = schema.timetable["MCA"];   // schedules, associations, stop times
const FFL = schema.fares["FFL"];       // flow records
```

Each value is a `FeedFile` from `@gb-transit/feed-parser`, so a line becomes a record through the
same interface whatever feed it came from.

```ts
import schema, {FeedConfig} from "@gb-transit/dtd-schema";
```

`FeedConfig` is the type of one feed's specification — a map of file extension to `FeedFile`.

## What is covered

| Feed | Files |
|---|---|
| `timetable` | `MSN`, `MCA`, `FLF`, `ZTR`, `ALF`, `CFA`, `TSI` |
| `fares` | `DIS`, `FFL`, `FNS`, `FSC`, `LOC`, `NDF`, `NFO`, `RCM`, `RLC`, `RST`, `RTE`, `SUP`, `TAP`, `TOC`, `TPK`, `TRR`, `TSP`, `TTY`, `TVL` |
| `routeing` | `RGC`, `RGD`, `RGE`, `RGF`, `RGG`, `RGH`, `RGK`, `RGL`, `RGM`, `RGN`, `RGP`, `RGR`, `RGS`, `RGX`, `RGY` |
| `nfm64` | one record type, under the empty key |

`downloadUrl` is exported alongside, for the one feed that is fetched over HTTP rather than SFTP:

```ts
import {downloadUrl} from "@gb-transit/dtd-schema";
```

## A note on what the layouts encode

The layouts carry decisions about the data, not just its shape. A numeric column of all spaces or
all zeroes is usually the feed saying it has nothing to say, and which strings count as absent is
set per column — an `easting` of `00000` is a missing coordinate, while an interchange status of
`9` is a real value. Those choices are commented where they are made, because getting one wrong
silently drops stations rather than failing.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/dtd-schema`
in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
