---
"@gb-transit/gtfs": major
"dtd2mysql": major
---

Emit splits and joins as GTFS linked trips instead of concatenating them

A DTD association is two trains sharing a vehicle for part of their run. Folding the associated
schedule into its base said something else - that a passenger boarding the associated train rides
through to the base's destination on one train - and where it arrives back where it came from, that
trip doubles back on itself. Both schedules now keep their own stops and their own trip, and the
association is a `transfers.txt` row with `transfer_type=4` and `from_trip_id`/`to_trip_id`.

`transfers.txt` gains `from_trip_id` and `to_trip_id` after `to_stop_id`, empty on every interchange
and fixed-link row, and `min_transfer_time` is empty on a linked-trips row.

**Breaking for consumers.** A through journey over a join or a split is no longer one trip, so
anything that does not read `transfers.txt` will show a change of trains where it used to show a
through service.

**Breaking for `--gtfs-import`.** `trips.trip_id` and `stop_times.trip_id` were `mediumint(12)
unsigned` while the build has always written a string, so every trip id loaded as `0` and the two
tables never joined. Both are now `varchar(32)`, as are the two new `transfers` columns, and all
four are in a primary key. `min_transfer_time` becomes nullable. A database imported with an earlier
version has to be reimported, and anything reading these tables - a view, a foreign key, a join
treating a trip id as a number - has to be updated with it.
