---
"@gb-transit/gtfs": minor
---

Move the GTFS vocabulary into `@gb-transit/gtfs-schema` and re-export it.

The entity types, the row types, `RouteType`, `TransferType`, `PickupDropOffType`, the
`TUID`/`RSID` identifiers and the two scalar modules — `Duration` and `PlainDate` — now live
in a package that depends on nothing. Every one of them is still exported from
`@gb-transit/gtfs` under the same name, so no consumer needs to change and the pinned type
surface of this package is unmoved.

The reason is `@gb-transit/gtfs-loader`, which reads a GTFS feed and runs in a browser as
well as in node. It wants to agree with the feed build about what a duration is and how a
day of the week is numbered — four declarations, worth sharing precisely because the two
sides must not drift. Taking them from `@gb-transit/gtfs` would have meant taking proj4,
`memoized-class-decorator` and a calendar typed against `Temporal` along with them: none of
it used, none of it removable, because a CommonJS-only package cannot be tree-shaken.

Splitting downwards was the alternative to duplicating the declarations, and duplication is
what the shared vocabulary exists to prevent. `libs/gtfs` keeps everything that has a
dependency: the transit model, the schedule transforms, the source SPI and the build.
