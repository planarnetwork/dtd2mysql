---
"@gb-transit/gtfs": major
"dtd2mysql": major
---

Emit splits and joins as GTFS linked trips instead of concatenating them

A DTD association is two trains sharing a vehicle for part of their run. Folding the associated
schedule into its base said something else - that a passenger boarding the portion rides through to
the base's destination on one train - and where the portion arrives back where it came from, that
trip doubles back on itself. Both schedules now keep their own stops and their own trip, and the
association is a `transfers.txt` row with `transfer_type=4` and `from_trip_id`/`to_trip_id`.

`transfers.txt` gains `from_trip_id` and `to_trip_id` after `to_stop_id`, empty on every interchange
and fixed-link row, and `min_transfer_time` is empty on a linked-trips row. The MySQL `transfers`
table takes both columns into its primary key.

**Breaking for consumers.** A through journey over a join or a split is no longer one trip, so
anything that does not read `transfers.txt` will show a change of trains where it used to show a
through service.
