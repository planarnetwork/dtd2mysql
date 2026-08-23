---
"dtd2mysql": major
"@gb-transit/gtfs": minor
"@gb-transit/dtd-source": minor
---

Put the fixed links where GTFS expects them, say what the feed covers, and check it.

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
