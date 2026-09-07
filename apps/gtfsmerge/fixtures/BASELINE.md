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
