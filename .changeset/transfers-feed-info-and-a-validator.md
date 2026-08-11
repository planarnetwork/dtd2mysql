---
"dtd2mysql": minor
---

Put the fixed links where GTFS expects them, say what the feed covers, and check it.

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
