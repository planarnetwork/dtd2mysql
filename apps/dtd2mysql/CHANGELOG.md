# dtd2mysql

## 8.0.2

### Patch Changes

- b675f63: Publish routes as the brands a passenger sees, with stable ids.

  A route used to be one operator's journey between two places - `SE:TON->SEV:2` -
  numbered in the order the routes were written, so `routes.txt` ran to thousands
  of rows and a `route_id` meant nothing outside the build it came from. A route
  is now the brand on the departure board: `GW` is Great Western Railway, `WIN` is
  the Windrush line, `SX` is the Stansted Express. The id is worked out from the
  schedule, so it is the same id in every build and can be referred to from
  outside the feed.

  `route_short_name` and `route_long_name` are the operator's own names for the
  brand, `route_color` is the colour it uses on a route map and
  `route_text_color` is black or white, whichever can be read on it. The six
  operators that run more than one line - London Underground, the Overground,
  Merseyrail, the Tyne & Wear Metro, West Midlands Trains and Greater Anglia's
  Stansted Express - have their line worked out from where the service calls;
  `libs/gtfs/src/data/route.ts` holds the rules and the branding, and is the one
  file to edit when a brand changes. Buses and replacement buses keep routes of
  their own, because neither runs on the line its operator's trains do.

  `route_desc` is no longer written. It carried the class and reservation
  availability of a train, which is a property of the train and not of the line it
  runs on: trips sharing a route disagreed about it.

  For a consumer of `@gb-transit/gtfs`: `RouteID` is a string rather than a
  number, `Trip.route_id` with it, and the optional fields of `Route` are `null`
  rather than `undefined`, as everywhere else in the feed. `Schedule.toTrip` no
  longer takes a route number, and `Schedule.routeShortName` is `Schedule.routeId`.

  An operator the build has no agency for keeps its ATOC code, so it gets a route
  of its own named after that code and attributed to the catch-all `ZZ` agency.
  That route keeps its id when the agency list catches up with the operator, which
  is the case a stable id is for: `LF` ran before the software knew about Lumo
  (West Coast).

- Updated dependencies [b675f63]
  - @gb-transit/gtfs@0.3.0
  - @gb-transit/dtd-source@0.2.1
  - @gb-transit/gtfs-output@0.2.1

## 8.0.1

### Patch Changes

- 500de2a: Credit the sources the feed is built from, in `attributions.txt`.

  NaPTAN is Open Government Licence v3.0, and the licence makes acknowledgement a
  condition of use rather than a courtesy. NaPTAN was turned on for the nightly
  and this landed before the first run that would have used it, so no published
  feed ever carried DfT coordinates without crediting the DfT - but it was one
  night away from doing so.

  Each enricher and extension already declared an `attribution` - who the source
  belongs to, on what terms, and whether the licence is share-alike - and nothing
  read it. Now every one that runs becomes a row, along with the timetable itself,
  which is not an enricher and so declares nothing: a feed that credits the source
  of its coordinates but not the source of its trains reads as a complete list and
  is not one.

  The declaration stays on the enricher rather than in a list kept centrally,
  because the thing that knows a source's licence is the code that fetches it. A
  central list goes stale the first time somebody adds a package and forgets, and
  the failure is silent.

  `attribution_licence` is a producer extension. The spec has `organization_name`
  and a URL and no field for the terms, which is the one thing an attribution
  statement has to say; the alternative was to bury it in `attribution_url` where
  nothing could read it.

- 6757892: Add the seam external data sources plug into.

  The core build turns the DTD into GTFS and nothing else. Real coordinates,
  step-free access and station groups come from elsewhere, each with its own
  licence and its own idea of what a station is. An enricher is one of those
  sources, and it writes through a ledger: every change has an author and a
  declared priority, higher priority wins whatever order they ran in, and every
  write that lost is kept in `provenance.json` so "why does the feed say that" has
  an answer.

  No enricher is configured yet, so the feed is unchanged.

  A build can also be described in a `gtfs.config.yaml` and run with
  `dtd2gtfs build --config`, which is how a nightly gets to differ from yesterday
  by a diff somebody approved rather than by an edited command line.

  Station coordinates come from NaPTAN when it is enabled. 2,622 of 3,054 stations
  match; the rest are buses, trams, ferries and Underground stops that NaPTAN's
  rail records do not cover. Most stations move a couple of metres, a few by
  kilometres.

- 2590b7b: Publish what the sources actually did, and let the page say who they are.

  `enrich()` printed matched, unmatched and conflicts to the console and nowhere
  else, so the one number D1 was designed around - the unmatched count a source is
  tempted not to report - survived only in a workflow log that expires in a
  fortnight. Nobody was ever going to compare last month's against this month's.

  The build now writes `enrichment-report.json` beside the feed: what each
  enricher and extension matched, missed and dropped, with their notes, and the
  sources the feed is built from. It is attached to the release rather than zipped
  into the feed, alongside `validation.json`. Distinct from `provenance.json`,
  which answers "why does this feed say that" in thousands of entries; this
  answers "did the sources work".

  The download page's sources list was hardcoded to one line naming the Rail
  Delivery Group. It now renders whatever the feed was actually built from, so
  turning an enricher on credits it without anybody remembering to edit the site -
  which matters because NaPTAN is OGL and acknowledgement is a condition of use,
  not a courtesy. A release published before the build declared its sources falls
  back to naming the timetable rather than showing an empty list.

- 2d684ab: NaPTAN can supply readable station names, if a config asks for it.

  MSN station names are upper case and truncated to sixteen characters, so the
  feed calls Newcastle Airport `NEWCASTLE AIRPRT`. The readable names come from a
  hand-maintained override file, which is the reason D7 cannot retire it.

  D3 declined NaPTAN's names because its `CommonName` is "Aberdare Rail Station"
  where the departure boards say "Aberdare". That suffix is the whole of the
  objection: strip it and 2,454 of the 2,580 names both sources describe are
  identical. Of the 126 that differ, 98 are a parenthesised county qualifier, 6
  are case - with NaPTAN the better of the two - and 22 are genuinely different.
  `docs/station-names.md` lists every one.

  `options: {names: true}` turns it on, off by default because renaming every
  station in the feed is a decision to make deliberately. Enricher `options:` was
  parsed and then dropped on the floor; it now reaches the enricher.

- 20b14df: Keep the feed releases worth keeping.

  A release a day, each carrying a 20 MB zip, accumulates forever. The last month
  is what anybody fetches; past that what is wanted is the ability to say what the
  feed looked like in April, and one release a month answers that as well as
  thirty do. The nightly now keeps the last 30 dailies plus the earliest release
  of each month.

  The earliest of the month rather than whichever is dated the 1st, so a night
  that failed to publish does not cost the whole month its record.

  The selection is a pure function with tests. A rule that deletes published
  artifacts should not be discoverable only by watching it run, and it considers
  `feed-` tags alone: the npm version tags share the release list, and a pruner
  that could reach them is one bad regular expression from deleting a release of
  the software.

  `provenance.json` is attached to the release too, alongside the validation and
  enrichment reports. All four describe the feed rather than being part of it, so
  they are assets rather than zip contents - somebody unzipping a GTFS feed should
  get GTFS.

- 732fd43: Publish RDG group stations as GTFS Fares v2 `areas.txt` and `stop_areas.txt`.

  A group station is a set of stations a ticket is valid to or from - `1072`
  "London Terminals" is Euston, Waterloo, King's Cross and fifteen others - and a
  rider holding one needs to know which stations that is.

  GTFS has no station-of-stations: `parent_station` is forbidden on a station and
  the hierarchy is one level deep, so a group cannot be modelled as nesting.
  `transfers.txt` is the wrong tool too, because it asserts you can walk between
  the stops, which is false for Euston and Waterloo. An area is a flat set with no
  nesting rules and no exclusivity, so a station can sit in London Terminals and a
  travelcard zone at once - which is what the source data actually says.

  Areas are published under the four digit NLC, the identity the rest of the rail
  industry uses and the one the timetable feed already carries as the `TI`
  record's `nalco`.

  This arrives through a new `Extension` seam, alongside the existing `Enricher`.
  An enricher improves an entity the DTD already produced; an extension
  contributes whole files the core build has no concept of. Neither can do the
  other's job, and an extension gets a read-only view of the feed rather than the
  ledger, because field-level provenance means nothing for a file that has no
  prior value to lose.

  Off unless a config asks for it, so the feed is unchanged by default.

## 8.0.0

### Major Changes

- 1d05d5b: Put the fixed links where GTFS expects them, say what the feed covers, and check it.

  **Major, because every identifier in the feed changes.** A consumer joining on a
  three letter `stop_id` or a bare ATOC `agency_id` has to move to `stop_code` and
  the NOC form, and there is no flag to keep the old ones - see below.

  - **`links.txt` is now `transfers.txt`.** The fixed links were in a file of this
    project's own invention that no consumer reads. They are transfers with a
    minimum time, merged with the station interchange rows. GTFS has nowhere to
    put a time window or a mode in a standard field, so they are producer
    extension columns, and 8,514 records become 2,406 rows because the stop pair
    is the primary key - the shortest wins, and the modes and window are the
    envelope of the records that describe the pair. `--links` still writes the old
    file for one release.
  - **`feed_info.txt` is written**, with the publisher, the language, the source
    feed as `feed_version`, and the window the feed can actually be trusted for.
  - **CI runs the MobilityData validator** over the mini fixture and fails on any
    error. The accepted warnings are committed with a reason each, so a new one
    fails the build and a fixed one has to be taken off the list.
  - **The feed no longer points at stops it does not declare.** 36 calls named
    `QHA` and `ZUX`, which appear in the z-train stop times and nowhere else in
    the feed - no name, no coordinate, nothing to publish a stop from. The calls
    are dropped and counted; the 31 trips that had nothing left are dropped with
    them.
  - **The CLI exits when it is finished.** The download commands left a database
    pool open, so the process hung after the transfer completed - harmless at a
    prompt, fatal for a scheduled job.
  - **Platforms are stops, and the stops are the ones the rest of the country
    uses.** A station is a `location_type=1` stop with a child per place a train
    calls, which is the structure the GTFS best practices describe, and both are
    identified by their NaPTAN ATCO code: `910GCLPHMJC` for Clapham Junction, with
    `9100CLPHMJC15`, `9100CLPHMJW3` and `9100CLPHMJM11` beneath it. A call that
    names no platform points at `9100` and the TIPLOC of the timing point.
    **`stop_id` is no longer a CRS code, so this breaks any consumer joining on
    one - the CRS is now `stop_code`**, on the station and on every stop beneath
    it. `transfers.txt` references stations. The ids are a function of the TIPLOC
    the timetable already carries, so nothing external is needed to produce them,
    and a feed in them can be merged with the DfT's bus and metro data as it is.
  - **`agency_id` is the National Operator Catalogue code**: `=SN`, `=AW`, `=GW`.
    A bare two letter code is an airline in the NOC - `BA` is British Airways -
    and rail operators are distinguished by the equals sign.
  - **An incremental's stop times and z-trains reach the database.** Records that
    generate their own id counted from zero on every import, and since `id` is the
    primary key, `INSERT IGNORE` silently dropped every row an earlier feed had
    already numbered - so an incremental's schedules landed and their stop times
    did not. Every counter is now continued from the table, not just the one for
    schedules.

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

- Updated dependencies [b2d81cf]
- Updated dependencies [1d05d5b]
  - @gb-transit/feed-parser@0.2.0
  - @gb-transit/dtd-schema@0.2.0
  - @gb-transit/gtfs-output@0.2.0
  - @gb-transit/gtfs@0.2.0
  - @gb-transit/dtd-source@0.2.0

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
