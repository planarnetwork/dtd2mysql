# @gb-transit/gtfs

## 0.3.0

### Minor Changes

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

## 0.2.0

### Minor Changes

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

## 0.1.0

### Minor Changes

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
