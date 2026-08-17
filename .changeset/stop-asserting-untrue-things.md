---
"dtd2mysql": minor
---

Stop the feed asserting things that are not true.

- **`trip_headsign` is where the train is going.** It was the TUID - an internal
  identifier like `C00049` - in a passenger-facing field. It is now the name of
  the last stop: "London Paddington". The TUID is still in `trip_id`, and
  `trip_short_name` still carries the RSID.
- **`wheelchair_accessible` is 0.** Every trip in GB claimed to be wheelchair
  accessible. Nothing in the DTD feed says so, and 0 is what GTFS uses for "no
  information". `bikes_allowed` was already 0 and means the same thing.
- **`stop_headsign` is empty.** It held the platform number, but the field
  overrides the trip headsign from that stop onwards - it means "this service
  terminates here", not "platform 3". With the trip headsign now saying
  something real, leaving the platform there would override it at every call.
  The platform needs a platform-level stop, which needs the station hierarchy.
- **The MSN header record is no longer a station.** It begins with `A`, like
  every station record, so it was read as one: stop `4/0`, named "F", off the
  coast of West Africa. This one is in the import, so a database needs
  re-importing to lose it.
- **An empty `schedule` table gives an error that says so**, rather than a
  `TypeError` from the export.
