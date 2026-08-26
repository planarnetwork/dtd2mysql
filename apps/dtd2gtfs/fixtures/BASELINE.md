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
