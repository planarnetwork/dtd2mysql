# @gb-transit/txc-source

Read a TransXChange feed into the rows of a GTFS feed.

```
npm install @gb-transit/txc-source
```

TransXChange is the format GB bus and coach timetables are registered and published in. This is the
bus counterpart to [`@gb-transit/dtd-source`](../dtd-source): the XML reading, the TransXChange
model, the journey expansion, and the nine streams that turn it into GTFS rows.
[`transxchange2gtfs`](../../apps/transxchange2gtfs) is the composition root that wires them up.

## The pipeline

Every stage is an object-mode `Transform`, which is why a national dataset converts in constant-ish
memory. The GTFS streams fan out from the two hub streams, so a conversion is a single pass.

```
FileStream → XMLStream → TransXChangeStream → TransXChangeJourneyStream
                                  │                      │
                                  │                      ├─► CalendarStream      → calendar.txt
                                  │                      ├─► CalendarDatesStream → calendar_dates.txt
                                  │                      ├─► TripsStream         → trips.txt
                                  │                      ├─► StopTimesStream     → stop_times.txt
                                  │                      └─► ShapesStream        → shapes.txt
                                  ├─► AgencyStream    → agency.txt
                                  ├─► RoutesStream    → routes.txt
                                  ├─► TransfersStream → transfers.txt
                                  └─► StopsStream     → stops.txt
```

The streams emit **rows, not CSV**. Each extends `RowStream<T, R>` and declares the file it writes
as a `FileSchema`; [`@gb-transit/gtfs-output`](../gtfs-output) does the formatting, so a column that
is not a field of the row it is written from does not compile.

`FileStream` reads an XML file, a zip of them, or a zip of zips — the shape a Bus Open Data Service
download arrives in.

## Known follow-up

Dates and times here are [`@js-joda`](https://js-joda.github.io/js-joda/), while the rest of this
repository uses `Temporal`. They are the same idea from either side of `Temporal` existing, and
converting would touch 600 lines of parsing and 1,400 lines of specs, so it has not been done as
part of anything else.
