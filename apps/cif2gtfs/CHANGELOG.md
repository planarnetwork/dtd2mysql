# cif2gtfs

## 1.0.1

### Patch Changes

- c696f32: Keep the trains that run in the repeated hour of the autumn clock change on the day they run.

  On the last Sunday of October 01:00 to 01:59 happens twice, once in BST and again in GMT.
  `shiftLateNightServices` moves anything departing before 02:00 onto the previous service day, which
  reads every such departure as the first pass. That is right for a service day that ends before the
  change, and wrong for one that runs through it: an 01:05 GMT departure is 26:05 of the Saturday
  service day, and telling it as 25:05 puts it alongside the train that already ran an hour earlier.

  The London Overground Windrush line is the only service in Great Britain that runs through the
  change, and it covers the repeated hour with new short term plan schedules dated to that Sunday
  alone - four in each direction between Highbury & Islington and New Cross Gate. A schedule of that
  shape - operator `LO`, on the Windrush line, a new schedule rather than an overlay, departing
  between 01:00 and 01:59, and whose own record is dated to the last Sunday of October and nothing
  else - is now left where that record puts it. The standard schedules cover the first pass and are
  shifted as before, as is an overlay on that Sunday, which is how the departure already in the
  timetable gets retimed. The count is logged when it is not zero, because the rule is expected to
  stop matching if the operator changes how it publishes these.

  `Association.apply` now asks whether the shift will move the schedule of `asDated` rather than of
  `assoc`. `asDated` is the one that reaches the shift, and it carries the calendar `coupled` has just
  narrowed, which is what the answer now depends on.

- Updated dependencies [c696f32]
  - @gb-transit/gtfs@2.0.1

## 1.0.0

### Major Changes

- First published release. `npm install -g cif2gtfs`.

  The package was private while there was no published feed to point people at. There is one now, so
  it goes to npm alongside the `@gb-transit` libraries it was held back with. No behaviour changes:
  the CLI, its flags and the feed it produces are what 0.1.0 built, and the mini fixture's golden is
  untouched.

  It now declares `main`, `types` and a `files` list of `dist` and `bin`, so the tarball is the built
  output rather than the working directory.

## 0.1.0

### Minor Changes

- 783c178: Publish an overnight associated schedule once, on the day its own record dates it.

  A schedule that runs the day after its base was published twice: once told in the base's service
  day, at times past 24:00, and once on the day its own record gives. Both are the same train, so a
  departure board built from the feed showed it leaving twice, and the copy told in the base's day was
  the one a coupling named. Over three months of the whole network that is 108 trips and 1,057 stop
  times, measured against RJTTF847/918; the mini fixture goes from 150 trips and 1,590 stop times to
  128 and 1,326.

  The associated schedule now stays where its own record puts it and the transfer names it there.
  GTFS does not ask the two trips a coupling names to run on one service day - a transfer carries no
  calendar, and `to_trip_id` is defined against the stop rather than the start of the trip - so a
  coupling that happens over midnight is now read as one, and the Aberdeen portion of the sleeper is
  the Tuesday 04:28 out of Edinburgh rather than a Monday 28:28.

  **Breaking for consumers whose planner cannot follow a transfer across a service day.**
  `--duplicate-overnight-associations`, `duplicateOvernightAssociations: true` in a config, or
  `GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS=1` publishes the copy as well and points the coupling at it,
  which is the previous behaviour. It is off by default, and a feed built with it carries the same
  train twice on purpose.

  **Breaking for `@gb-transit/gtfs`.** `applyAssociations` and `Association.apply` take the setting as
  a further argument. `AssociationApplication` replaces `associated`/`asDated` with `asDated`,
  `duplicated` and `unassociated`, which say which of the three copies each one is rather than leaving
  two of them to overlap. `addLateNightServices` is now `shiftLateNightServices`, and no longer takes
  an `IdGenerator`: it replaces each schedule with the shifted copy, which keeps the id it was given.
  `Schedule.copyToPreviousServiceDay` is the one implementation of the day shift both it and an
  overnight duplicate use.

- 0f6bf84: Add `--remove-passing-points`, which defaults to `true`, so the feed is unchanged by default.

  Half the CIF's intermediate location records are places a service runs through without stopping,
  and 892,000 of them are at a station the feed publishes. They have always been dropped at the source
  query, so the only calls with no pickup and no drop off in the feed were the 4,800 operational stops
  where a service stops but nobody boards.

  `--remove-passing-points=false`, `removePassingPoints: false` in a config, or
  `GTFS_REMOVE_PASSING_POINTS=0` keeps them, as calls with `pickup_type` and `drop_off_type` of `1`
  and the pass time as both the arrival and the departure. Over three months of the whole network that
  is 3.43 million stop times against 2.84 million. Trips, routes and calendars are identical;
  `stops.txt` gains 59 stops. A passing point names its platform like any other call, falling back to
  the station where the pass record gives none: 89% of passing calls land on a boarding point the feed
  already publishes because something stops there, so the id a passing call carries is the one a
  stopping call at that platform carries.

  Fixes a bug it uncovered: where two of a service's timing points share a CRS, the one that boards or
  alights wins, but a request stop has `pickup_type` 3 rather than 0 and so had nothing to win with. 28
  of them were displaced by the point the service passes on the way in.

  The nightly workflow now publishes both feeds, `gtfs.zip` and `gtfs-passing-points.zip`, each gated
  by its own validator baseline.

### Patch Changes

- Updated dependencies [783c178]
- Updated dependencies [0f6bf84]
  - @gb-transit/gtfs@2.0.0
  - @gb-transit/dtd-source@1.1.0
  - @gb-transit/enrich-naptan@1.0.1
  - @gb-transit/extend-station-groups@1.0.1
  - @gb-transit/gtfs-output@1.0.1

## 0.0.2

### Patch Changes

- Updated dependencies [b675f63, 2a1ca37]
  - @gb-transit/dtd-source@1.0.0
  - @gb-transit/enrich-naptan@1.0.0
  - @gb-transit/extend-station-groups@1.0.0
  - @gb-transit/gtfs@1.0.0
  - @gb-transit/gtfs-output@1.0.0

## 0.0.1

### Patch Changes

- Updated dependencies [b2d81cf]
- Updated dependencies [1d05d5b]
  - @gb-transit/gtfs-output@0.2.0
  - @gb-transit/gtfs@0.2.0
  - @gb-transit/dtd-source@0.2.0
