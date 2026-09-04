# @gb-transit/feed-parser

Declarative fixed-width and CSV record parsing for the GB rail data feeds.

```
npm install @gb-transit/feed-parser
```

The RSP feeds are flat text: fixed-width columns in the timetable and routeing files, delimited
records in others, and a single file often holds several record types told apart by the first few
characters. This library is how a layout is written down once, as data, instead of as a hand-rolled
`substring` loop per file.

It knows nothing about any particular feed. The layouts themselves live in
[`@gb-transit/dtd-schema`](https://www.npmjs.com/package/@gb-transit/dtd-schema).

## Describing a record

A record names its fields, where each one sits, and which of them form its key:

```ts
import {FixedWidthRecord, IntField, TextField} from "@gb-transit/feed-parser";

const physicalStation = new FixedWidthRecord(
  "physical_station",
  ["tiploc_code"], {
    "station_name": new TextField(5, 26),
    "tiploc_code": new TextField(36, 7),
    "crs_code": new TextField(49, 3, true),
    "minimum_change_time": new IntField(63, 2, false, [])
  }
);
```

A delimited record is the same idea with positions counted in columns rather than characters:

```ts
import {CSVRecord, DateField, TextField} from "@gb-transit/feed-parser";

const newStation = new CSVRecord(
  "new_station",
  ["nfm64_station_code", "new_station_code"], {
    "nfm64_station_code": new TextField(0, 3),
    "new_station_code": new TextField(1, 3),
    "start_date": new DateField(2),
    "end_date": new DateField(3)
  }
);
```

## Fields

`TextField`, `VariableLengthText`, `IntField`, `ZeroFillIntField`, `DoubleField`, `BooleanField`,
`DateField`, `ShortDateField`, `NullDateField`, `TimeField` and `ForeignKeyField`.

The distinction the field types exist to make is between a value and an absence. A numeric column
of all zeroes or all spaces usually means the feed has nothing to say, but not always — so
`IntField` takes the list of strings that count as null for that column, and narrowing it is a
decision about the data rather than a formatting detail:

```ts
// blank means "not an interchange", but 9 is a value this column takes
new IntField(35, 1, true, [" "])
```

Reading a field that will not parse raises `ParseError`, naming the record, the field and the text
it was given, so a malformed line says which column is wrong.

## Files

A file is one record type or several:

```ts
import {MultiRecordFile, SingleRecordFile} from "@gb-transit/feed-parser";

const RGX = new SingleRecordFile(newStation);

// the record type is read from character 0
const MSN = new MultiRecordFile({"A": physicalStation, "L": alias}, 0);
```

`MultiRecordFile` ignores a line whose identifier it has no record for, which is how trailer lines
and record types a consumer does not care about are skipped.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/feed-parser`
in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
