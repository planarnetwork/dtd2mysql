# Baseline changes

Every change to a committed baseline is recorded here, with the reason and the ticket. CI fails a
commit that touches one without an entry.

The baselines capture *current* behaviour, defects included. That is the point: rebaselining is the
normal path for a correctness fix, and the diff is the evidence the fix did what it claimed. The
requirement is that it is deliberate and explained, not that it is rare.

Add an entry to the top. `UPDATE_GOLDEN=1 yarn vitest run apps/dtd2gtfs` regenerates the mini
golden; `UPDATE_SURFACE=1 yarn vitest run libs/gtfs` regenerates the type surface. **Read the diff
before committing it** - that is the whole value of the file being text.

---

## Passing points, available and off

**No change to any feed by default**, and the mini golden is untouched: `--remove-passing-points` is
on, so a build that says nothing drops the locations a service runs through exactly as it did.

`validator-baseline.json` moves to `.github/`, beside the workflows that are the only things that
read it, and `.github/validator-baseline-passing-points.json` joins it. The second baseline holds the
feed built with `--remove-passing-points=false`, which the nightly now publishes as
`gtfs-passing-points.zip` alongside the standard one.

It accepts 27 `stop_time_with_arrival_before_previous_departure_time` against the standard feed's 4.
The 23 extra are the CIF's two clocks disagreeing: a call publishes its public time and a passing
point has only its working time, so `C17075` passes `SELYOAK` at `2116H` and then calls at `UNVRSYB`
with a public arrival of `2115`. Correcting it would mean inventing a time for one of them.

A passing point names its platform, per review on #152. The first version dropped it on the grounds
that a train runs through on a line rather than a platform. Measured, that is wrong twice over: 89%
of passing calls land on a boarding point something already stops at, so the platform is real and the
id is the one a stopping call uses; and dropping it produced *more* stops, not fewer, because 99
station-level children had to be minted with nothing but passing calls to host. Keeping it reuses
what is there and adds 12 - `stops.txt` is 9,241 against 9,328, and 9,182 in the standard feed. The
validator counts are unchanged either way, so the baseline above holds.

Also fixed, and visible in neither baseline because the fixture has no case of it: where two of a
service's timing points share a CRS, a request stop is `pickup_type` 3 rather than 0 and so had
nothing to win the station with. 28 of them were displaced by the point the service passes on the way
in, which moved `3,3` on the full feed from 17,291 to 17,263. Both feeds now agree at 17,291.

## An unadvertised stop is not a drop off either

**#162.** Activity `N`, "stop not advertised", gated `pickup_type` and not `drop_off_type`, so a
stop the public cannot use was published as one they could alight at. It now gates both, and it
takes precedence over `R` - an unadvertised request stop is no stop at all, where it used to come
out as `3`, "coordinate with the driver".

`golden/stop_times.txt` moves **23 rows from `1,0` to `1,1`**, and nothing else in the feed moves.
Every one of them is the last stop of a linked trip leg, activity `TF N`: `C04558` at Carstairs
(12 rows) and `C04551` at Edinburgh (11). Those are the joining stops F4 created - the passenger
stays in their seat across the `transfer_type=4` link rather than getting off, which is exactly
what the source says by not advertising the call. The legs are pick up only for their whole length
and now have no drop off at all, which reads oddly in isolation and is correct: the drop off is on
the trip they are coupled to.

Entered after the commit rather than with it. The CI step that requires this file to move ran on a
shallow checkout, where `git diff base...HEAD` fails with `no merge base` and the `|| true` on it
turned the failure into "no baselines changed" - the guard has passed every pull request without
checking one.

## F4 · Splits and joins as linked trips

**Closes #81 and #80.** Associated schedules are no longer concatenated into their base. Both
schedules keep their own stops and their own trip, and the association is written as a
`transfers.txt` row with `transfer_type=4` and `from_trip_id`/`to_trip_id`.

`golden/trips.txt` **stays at 128 trips**. The 56 concatenated ones - `C04547_C04566`,
`C04551_C04566`, `C04558_C04561`, `C04569_C04543`, `C04569_C04577` - are replaced one for one by the
associated schedule under its own TUID, and `golden/transfers.txt` gains 56 `transfer_type=4` rows.
The trip count does not move because the base was always emitted alongside the concatenation; what
goes is the duplication, and `golden/stop_times.txt` loses the leg that was written twice.

`transfers.txt` gains **`from_trip_id` and `to_trip_id`**, in the spec's field order after
`to_stop_id`. Both are empty on every interchange and fixed-link row. `min_transfer_time` is now
empty on a linked-trips row, where the passenger does not get off. The MySQL `transfers` table takes
the two columns into its primary key, because the pair of stops is only unique once the trips are
part of it - a coupling happens at a station the feed already gives an interchange time for.

**`C04569`/`C04543` is the case to read.** The Aberdeen portion is now its own trip, dated on the
Monday the sleeper left Euston and departing Edinburgh at **28:28**, linked from the base's 28:20.
A transfer carries no calendar, so the two trips have to agree which day they are coupled on, and
the day the base ran is the one they share - `applyAssociations` cuts the associated schedule to the
days the association is in force, so the days the two trips share are the days the coupling happens.

`validator-baseline.json` (root) drops `stop_time_with_arrival_before_previous_departure_time` from
4 to 1. Three of the four were `G38297`/`G38968` at Swansea, where the source has the joining train
arriving after the train it joins has left; that contradiction is still in the feed, but it is now a
coupling between two trips that each read forwards.

**A schedule that runs the day after its base is published twice.** The coupling wants both trips on
one service day, so the associated schedule is told in the base's - which turns a Swansea departure
at 08:41 into 32:41 the day before, no use to anyone boarding it there. It is now also published on
the day its own record gives, at its own times, every day it runs. `golden/trips.txt` goes from 128
to 150: `C04543` is a Monday at 28:28 for the coupling and a Tuesday at 04:28 for a passenger.

Not where it departs before 02:00, because `addLateNightServices` would move that copy straight back
onto the base's day and leave the same trip twice. Feed-wide: 155 trips and 1,479 stop times more,
`transfers.txt` unchanged.

**A trip that joins another is headed for where it ends up.** The Carstairs portion terminated at
Carstairs in the timetable and read that way, when everyone on it carries on to Euston - 1,537 trips
feed-wide. Unlike a divide the answer does not change partway along, so it is `trip_headsign` rather
than the stops. A divide whose base terminates at the divide keeps its own destination and says the
rest with `stop_headsign`, as any divide does.

**`stop_times.txt` gains `stop_headsign`, which was empty on every row.** A trip is headed for where
it ends, so the London Bridge to Caterham says Caterham - and stops naming the front half coming off
at Purley for Tattenham Corner. The concatenation used to say it by accident, in a trip that ran
through to one of the two, so this is information the change would otherwise lose. `stop_headsign`
overrides the trip headsign at a stop, which is where the answer belongs, because it changes partway
along: **"Caterham and Tattenham Corner" as far as Purley Oaks, and nothing from Purley on**, where
the trip headsign is right by itself.

In the fixture that is the Highlander, headed **"Inverness, Aberdeen and Fort William"** to Carlisle
and Inverness alone from Edinburgh, where both divides happen. Feed-wide it is 8,744 stop times
across 1,264 trips and 58 distinct headsigns, at most three destinations. A destination is named once
however many trips divide off for it - a schedule with a permanent record and an overlay of it is two
trips going to the same place. Joins get nothing: once two trains are one they have one destination,
which the trip headsign already gives.

**It is the first quoted value in the feed.** `"Inverness, Aberdeen and Fort William"` has a comma in
it, so the CSV writer quotes it, and nothing in any file has ever needed that. The `columns` helper
in `build.spec.mts` split on every comma and now parses quoted fields; a consumer doing the same will
need the same fix.

**What a split cannot say.** The coupling reads "stay on board and you are on the portion", while the
base carries on to its own destination as well. Which of the two a passenger stays on depends on
which coaches they are in, and GTFS has no way to say that - so a planner may offer both. Publishing
the portions separately is still nearer the truth than a concatenation that offered only one of
them, but it is a limitation rather than a complete answer.

The fixture baseline accepts **`transfer_with_suspicious_mid_trip_in_seat`** (WARNING, 56). The
coupling is anchored part way along the base on purpose, because the base is not cut at it. The
validator says intentional mid-trip transfers can ignore this, and cutting the bases to silence it
would add a trip per association and turn a through journey into a change of trains for anything
that does not read `transfers.txt`.

`type-surface.json` gains `AssociationApplication`, `AssociationLink`, `AssociatedSchedules`,
`TripLink` and `linkedTrips`. `applyAssociations` now returns the schedules and the links rather
than the schedule index alone.

## NaPTAN station names, available and off

**No change to any feed by default.** `type-surface.json` gains `stationName` from `enrich-naptan`;
`NaptanEnricher` gains a fourth constructor argument, defaulted to the behaviour it already had.

With `options: {names: true}` the enricher takes NaPTAN's station names, stripped of the
"Rail Station" suffix - `NEWCASTLE AIRPRT` becomes `Newcastle Airport`. See `docs/station-names.md`
for where the two sources disagree, and D7 for why it matters.

## D8 · attributions.txt

`golden/` gains **`attributions.txt`**, with one row: Rail Delivery Group, the source of the
timetable. Nothing else in the feed moves.

It is written whatever ran, because the timetable always needs crediting. With an enricher
configured it gains a row per source - the nightly, which runs NaPTAN as of #143, now credits the
Department for Transport under the Open Government Licence. **That was the point of the ticket: OGL
makes acknowledgement a condition of use.** This landed before the first nightly that would have
used NaPTAN, so no published feed ever carried DfT coordinates uncredited.

`attribution_licence` is a producer extension. The spec has `organization_name` and a URL and no
field for the terms, which is the one thing an attribution statement has to say. `unknown_column`
is already accepted for the twelve columns B2 added to `transfers.txt`.

`type-surface.json` gains `AttributionRow`, `AttributionRole`, `createAttributions` and
`TIMETABLE_ATTRIBUTION`; `Attribution` gains an optional `role`. All additions.

## D12 · the extension SPI and station groups

`type-surface.json` gains the extension exports from `libs/gtfs` - `Extension`, `ExtensionFile`,
`ExtensionOutput`, `ExtensionReport`, `FeedView`, `extend`, `checkKeys` and `ExtensionConfig` - the
Fares v2 entities `Area`, `AreaID`, `AreaRow`, `StopArea` and `StopAreaRow`, and the whole surface
of the new `extend-station-groups` package. `MutableFeed` gains `station()`, which finds a station
by CRS rather than by the ATCO code the feed publishes.

Every entry is an addition; nothing is renamed or removed, so no consumer breaks.

**No feed output changes unless an extension is configured.** `extensions:` was validated and
dropped before this, so a config naming one was already doing nothing.

## D1 · the enricher SPI

`type-surface.json` gains the enrichment exports from `libs/gtfs`: `Enricher`, `EnrichmentReport`,
`Attribution`, `MutableFeed`, `Provenance`, `Write`, `FieldHistory`, `enrich`, `order` and
`provenanceFile`, plus the build config types. `GTFSOutput` also gains `write`, for files that are
documents rather than tables. No feed output changes unless an enricher is configured.

This is the surface other packages implement against, so from here a rename is somebody else's
build breaking, which is the reason the snapshot exists.

## B23 · platforms as child stops, in NaPTAN's identifiers

**Every id in the feed changed.** `stop_id` is the ATCO code - `910G` and the TIPLOC for a station,
`9100` and the TIPLOC of the timing point and the platform for a place a passenger boards - and
`agency_id` is the NOC code, `=SN` rather than `SN`. `stop_code` is the CRS, which was `stop_id`.

`stops.txt` goes from 195 rows to 345 in the fixture: all 195 stations become `location_type=1` and
every distinct timing point and platform called at becomes a child - 150 of them, of which 26 carry
no platform, for the calls that name none. `stop_times.stop_id` points at the child, `transfers.txt` at
the station, and `routes.txt` carries the prefixed agency. Nothing else moves.

## B10, B11, B12 · places that do not exist

`stops.txt` loses the `XAG` CIE station, which has an all-zero coordinate and nothing calling at it,
and the `QXD`/`QXO` operator placeholders. `transfers.txt` loses their three self-transfer rows.
`routes.txt` loses the XC placeholder route and renumbers the two after it. `trips.txt` loses the
two trips that called only at placeholders.

## B1, B2 · transfers and feed_info

`links.txt` is gone by default and its rows are in `transfers.txt` with the mode, window and days as
extension columns. `feed_info.txt` is new.

## B15 · stops the feed does not declare

No change to the fixture, which has no dangling calls. Recorded so the absence is deliberate.

## Reading publishes its junction rather than its station

`stops.txt`: Reading is `910GRDNGSTN` in place of `910GRDNGORJ`, and gains `stop_desc` 2 in place of
9. A CRS can have several TIPLOCs and whichever arrived first used to win; a
`cate_interchange_status` of 9 marks a subsidiary location, so the station is now preferred over the
junction sharing its code. 75 stations change on the full feed, one in the fixture.

The TIPLOC was `stop_code` when this landed and is the station's half of `stop_id` now, which is
what makes it worth getting right: it is the id NaPTAN and the DfT's GTFS use.

## B4, B7, B8, B9, B13 · things that are not true

`trips.txt` gains real headsigns and loses the `wheelchair_accessible=1` claim. `stop_times.txt`
loses the platform from `stop_headsign`. `stops.txt` loses the MSN header record, stop `4/0`.
