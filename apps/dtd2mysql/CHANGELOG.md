# dtd2mysql

## 7.1.0

### Minor Changes

- 4feaed6: Make the feed reproducible: same input, same bytes.

  `route_id` and `service_id` were counters that advanced in whatever order the
  schedules came back in, so the same timetable could be numbered differently from
  one run to the next and was numbered differently by different sources. `route_id`
  now comes from a sort of the route's name - operator, origin, destination, mode -
  and `service_id` from a sort of the calendar's date range, day mask and
  exclusions.

  Every output file is now written in a declared order as well: stops by `stop_id`,
  trips by `trip_id`, stop times by `(trip_id, stop_sequence)`, and so on.

  **Identifiers and row order both change with this release.** The trips, calendars
  and stop times are the same; they are numbered and ordered differently. Anything
  storing a `route_id` or `service_id` from a previous feed has to re-read them,
  which is what GTFS expects of a dataset-internal id but is worth knowing before
  you upgrade.

  One piece of content changes with them. `route_desc` says whether first class is
  available, which is a property of a train rather than of the line it runs on, and
  trips on the same route can disagree - **352 of the 6,184 routes do**. Whichever
  trip reached the route first used to decide it; now the description that sorts
  first does. The value was arbitrary either way, but it no longer depends on the
  order the rows came back in. Nothing else about a route changes.

- 5c7f1ad: Stop the feed containing places that do not exist.

  - **Twelve operator placeholders are gone.** `CH ORIGIN`, `XC DESTINATION` and
    the rest are in the MSN so a schedule has somewhere to start and end when the
    real terminus is not known. They were stops in the North Sea, and 18 trips
    called at them. Every one of those trips had two stops and both were
    placeholders, so the trips go too. Both counts are logged.
  - **Tottenham Court Road is no longer in the Indian Ocean.** Its override entry
    had the latitude and longitude the wrong way round. All 2,594 entries are
    checked against the bounds of the feed now, so the next transposition fails a
    test rather than shipping.
  - **43 Irish stations are no longer in the South Atlantic.** Their easting and
    northing are all zeroes, which is the feed saying it has no coordinate rather
    than a coordinate of zero. No train in the feed calls at any of them, so they
    are left out until a source can locate them, instead of being published at a
    made-up point. Two Blackpool bus-tram stops that fixed links do reference are
    published at 0,0 and named in a warning.

- 2ad1529: Give the GTFS build a clock, and honour the range everywhere.

  `--today` fixes the date the build covers, so a feed can be regenerated tomorrow
  and compared to the one generated today; without it the output is a function of
  the day it ran. `--range` sets how far ahead to build. Both are also read from
  `GTFS_TODAY` and `GTFS_RANGE`, and the flags override the variables.

  `--range` fixes a live bug. `GTFS_RANGE` only ever reached the passenger schedule
  query: the replacement bus and association queries hardcoded three months, so
  `GTFS_RANGE=6 MONTH` produced six months of trains with three months of
  associations - on the current feed, 93,348 extra schedules against 846
  associations silently dropped. All three now derive their window from one value.
  At the default of three months the output is unchanged.

- 0130710: Stop the feed asserting things that are not true.

  - **`trip_headsign` is where the train is going.** It was the TUID - an internal
    identifier like `C00049` - in a passenger-facing field. It is now the name of
    the last stop: "London Paddington". The TUID is still in `trip_id`, and
    `trip_short_name` still carries the RSID.
  - **`wheelchair_accessible` is 0.** Every trip in GB claimed to be wheelchair
    accessible. Nothing in the DTD feed says so, and 0 is what GTFS uses for "no
    information". `bikes_allowed` was already 0 and means the same thing.
  - **`stop_headsign` is empty.** It held the platform number, but the field
    overrides the trip headsign from that stop onwards - it means "this service
    terminates here", not "platform 3". With the trip headsign now saying
    something real, leaving the platform there would override it at every call.
    The platform needs a platform-level stop, which needs the station hierarchy.
  - **The MSN header record is no longer a station.** It begins with `A`, like
    every station record, so it was read as one: stop `4/0`, named "F", off the
    coast of West Africa. This one is in the import, so a database needs
    re-importing to lose it.
  - **An empty `schedule` table gives an error that says so**, rather than a
    `TypeError` from the export.

### Patch Changes

- a3c697c: Stop `--gtfs-zip` producing a truncated feed.

  The build wrote each file through a CSV writer piped into a file and waited on
  the writer, which finishes when it has handed on its last row rather than when
  the row is on disk. A one second sleep stood in for the difference. That is not
  long enough to flush a 164 MB `stop_times.txt`, so the archive could be sealed
  around a partial file with nothing to indicate it.

  The output now waits for the files themselves, and the zip is written in process
  and awaited, so the command returns only once the archive is complete.

## 7.0.0

### Major Changes

- 0f61a32: Split the tool into a monorepo.

  `dtd2mysql` is now assembled from five `@gb-transit` packages rather than one flat tree,
  and they are published in their own right: a GTFS build that reads from somewhere other
  than this tool's MySQL schema can depend on `@gb-transit/gtfs` without the CLI.

  **The command line is unchanged.** Same flags, same environment variables, same GTFS
  output - verified byte-identical against the same database before and after the move. If
  you install `dtd2mysql` to run it, nothing about this release asks anything of you.

  **The package layout is not**, which is why this is a major. Anything importing from the
  package rather than running it has to move:

  - `dtd2mysql/dist/src/...` and `dtd2mysql/dist/config/...` no longer exist. That code is
    in the `@gb-transit` package that now owns it - record layouts in `dtd-schema`, the
    parser in `feed-parser`, the GTFS model, transforms and build in `gtfs`, the writers in
    `gtfs-output`, SFTP and feed sequencing in `dtd-source`.
  - `files` is `dist` and `bin`. `main` and `types` resolve to `dist/index.js` and
    `dist/index.d.ts`, which is where they are emitted - `main` previously named a path that
    the `files` list did not ship, so `require("dtd2mysql")` never worked.

### Patch Changes

- Updated dependencies [0f61a32]
  - @gb-transit/feed-parser@0.1.0
  - @gb-transit/dtd-schema@0.1.0
  - @gb-transit/dtd-source@0.1.0
  - @gb-transit/gtfs@0.1.0
  - @gb-transit/gtfs-output@0.1.0
