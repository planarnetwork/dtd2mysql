# Baseline changes

Every movement in `fixtures/tiny/golden` is written up here, with what changed
and why, so a diff in review can be checked against a reason rather than taken on
trust. CI fails a pull request that moves a golden without adding an entry.

## Absorbed into the monorepo

`fixtures/tiny/golden` is new: gtfsmerge had no fixtures at all, and no test
covering `MergeCommand`, `GTFSOutput`, `ZipOutput` or any of the six mergers.

The merged feed differs from what the standalone tool produced, in these ways
and no others:

**Distances are measured correctly.** Two bugs, both in the one part of the tool
with no test:

- The ruler was built at 46°N, central France. GB is 50–59°N. It is now 54, the
  middle of the island, and `--ruler-latitude` sets it for anywhere else.
- The coordinates were passed as `[latitude, longitude]`. Cheap Ruler takes
  `[longitude, latitude]`, as GeoJSON does. Every generated distance was
  therefore wrong by a factor of `1/cos(latitude)` on one axis: a gap of 328m at
  54°N was written as 557m, so `min_transfer_time` on a generated walk transfer
  was about 70% too long.

Only generated walk transfers are affected. A transfer the input feed declared is
carried through untouched.

**`stops.txt` gains `platform_code`.** The rail feed this repository builds says
which platform a boarding point is in that column, and a merge that did not write
it threw that away.

**`transfers.txt` gains `from_trip_id` and `to_trip_id`, and they are
renumbered.** A `transfer_type` 4 is a coupling between two named trips, and
without those columns the row says nothing. They are remapped along with every
other id in the feed; a coupling whose trip was dropped is dropped with it.
Before this, merging a feed containing couplings produced rows referring to trip
ids that no longer existed.

**Quoting is correct.** The hand-rolled CSV writer quoted a field containing a
comma but did not escape a quote inside it, and wrote `undefined` for a missing
value. The shared writer doubles an embedded quote, quotes on a newline too, and
writes an absent value as empty.

**A transfer the feed already declared is no longer duplicated.** Where an input
declared `A → B` but not `B → A`, the walk transfer generator wrote the pair
anyway, producing a second `A → B` with a different `min_transfer_time` — and
`transfers.txt` is the one file the merge does not deduplicate, so it reached the
output. The condition was `!exists || !reverseExists`; it is `&&`, because the
generator writes both directions. Inherited rather than introduced, but it sits
between the two distance bugs above and leaving it unmentioned would read as
examined and accepted.

**A file with no rows now has a header.** It used to be a zero-byte file.

**`--no-date-filter` keeps the calendars instead of dropping all of them.** The
test read `!filterBefore || end_date < filterBefore`, which is true whenever
there is no filter — so running without a date filter dropped every calendar in
every input, and the merged feed kept only the services `CalendarFactory` could
synthesise out of orphan `calendar_dates` rows. Found by the end-to-end merge in
`tests`, which merges without a filter: 128 rail trips came out as 14.

**A transfer to a stop nothing calls at is dropped.** Only the stops something
calls at are published, so such a transfer was a reference to a row that is not
in the feed. A rail feed publishes a station because a fixed link reaches it,
and this does not, so the two disagree about exactly those stations — 97 of the
337 transfers in a merged rail feed were dangling.

## Calendars say what the feed said

**A removed date is no longer a running one.** `CalendarFactory` read every
`calendar_dates` row as a date the service runs on, so a service described only
by its dates gained every date the feed had written down as a removal. Nothing in
the fixtures reached it before; `CalendarFactory.spec.ts` covers it now.

**A service that runs on no day is dropped, with its trips and their calls.** A
calendar naming no day, a range whose every running day is excluded, and a set of
dates that are all removals all describe a service nothing can be planned onto.

## The files a merge was dropping

The merge wrote eight files and dropped everything else, so `attributions.txt`,
`areas.txt`, `stop_areas.txt` and `feed_info.txt` did not survive being merged.
The golden gains all four, and the fixtures gain the rows to build them from.

**`attributions.txt`** is the union of the inputs', deduplicated on the whole
statement rather than on the organisation: the same body can be the authority for
two things under two licences, and both rows are true. Both fixtures name the DfT
for NaPTAN, so it appears once.

**`areas.txt` and `stop_areas.txt`** carry the Fares v2 station groups. A
membership follows the same two rules a transfer does — a call at a platform is a
call at the station above it, so `9100ALPHA1` is written as `910GALPHA`, and a
membership naming a stop nothing calls at is dropped, which is what happens to
`910GNOTCALLED`. The area it belonged to stays: an area with no members is a
group that nothing in this feed is in, which is true and harmless, and dropping
it would be the merge deciding the group no longer exists.

**`feed_info.txt`** is one row for a feed made of several, and there is no answer
here that is simply correct. The publisher is the first input's, the window is the
widest of the inputs', and the version names both, joined: `RAIL001+BUS001`.
Anything publishing a merged feed as its own should write this file itself rather
than take what falls out here.

**The golden's file list is now the test.** It read from a list spelled out in
the spec, so the four files above could have gone missing again without any test
noticing. It reads the golden directory instead.

## Blocks, shapes and frequencies

**`trips.txt` gains `block_id` and `shape_id`.** They were dropped as something
"a merge has nothing to put in", which was true of two rail feeds and is not true
of a bus feed, where both are populated. Both are renumbered rather than carried
across: a block is one vehicle working through a day and a shape is one line on
the ground, each named by the feed that published it and by nobody else, so two
feeds numbering a block `1` do not mean the same vehicle. The fixtures do exactly
that, and the merged feed gives them `1` and `2`.

**`shapes.txt` and `frequencies.txt` are written.** A shape is read in the same
pass as the calls — it needs the same thing to have happened first, the trips
renumbered — and streamed for the same reason: a national bus feed's shapes.txt
is 2.5GB. A shape no surviving trip is drawn along is dropped, which is what
happens to the fixture's `SHP2`, whose trip the date filter removes, and `SHP3`,
which no trip names. A frequency is renumbered onto its trip's new id and dropped
with a trip that did not survive.

`frequencies.txt` was not a file `@gb-transit/gtfs-schema` or
`@gb-transit/gtfs-loader` knew about. Both now do.

## The merged feed's validator baseline

Carrying `feed_info.txt` and `attributions.txt` through a merge moved three notices onto the merged
feed. All three are the rail feed's own, accepted in
[`apps/cif2gtfs/fixtures/mini/validator-baseline.json`](../../cif2gtfs/fixtures/mini/validator-baseline.json)
for the same reasons, and they appear here now only because the files they come from are no longer
dropped on the way through:

- `missing_feed_contact_email_and_url` — the rail feed has no contact address to publish.
- `service_window_outside_feed_period`, 24 of them — the rail feed's calendars run wider than the
  three month window it declares. The merged feed declares the window its inputs declared rather
  than widening it to cover their services, so it inherits the mismatch rather than papering over
  it with a window no publisher claimed.
- `unknown_column` — `attribution_licence`, the producer extension the spec permits and the
  validator does not know. It is the one column that says the terms, which is the whole point of the
  file.

`missing_recommended_file` is removed: it was `feed_info.txt`, and its reason said that neither
input had one the merge could carry. The rail feed did, and now it is carried.

## A membership is checked against the whole merged feed

`stop_areas.txt` gains `1072,9100BUSSTOP`. A membership naming a stop nothing calls
at is still dropped, but "nothing calls at it" was being decided against the feed
being written rather than against the merged feed: the rail feed naming a stop
only the bus feed serves lost the membership while the stop itself was published,
so the group came out quietly short of a member. The memberships are held until
every feed has been read and filtered once, against every feed's calls.

`transfers.txt` decides the same question the same way and is left alone. It is
older than this and its behaviour is the one the golden already records.
