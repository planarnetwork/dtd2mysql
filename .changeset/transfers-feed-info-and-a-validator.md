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
- **The feed no longer points at stops it does not declare.** 36 calls named
  `QHA` and `ZUX`, which appear in the z-train stop times and nowhere else in
  the feed - no name, no coordinate, nothing to publish a stop from. The calls
  are dropped and counted; the 31 trips that had nothing left are dropped with
  them.
- **The CLI exits when it is finished.** The download commands left a database
  pool open, so the process hung after the transfer completed - harmless at a
  prompt, fatal for a scheduled job.
- **Platforms are stops.** A station trains call at by platform is now a
  `location_type=1` station with a child stop per platform - `PAD_A`, with
  `parent_station` and `platform_code` - which is the structure the GTFS
  best practices describe. **`stop_times.stop_id` points at the platform, so
  this breaks any consumer joining on a three-letter code.** A station is only
  split where every call at it names a platform: 335 stations, 729 platforms.
