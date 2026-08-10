---
"dtd2mysql": minor
---

Make the feed reproducible: same input, same bytes.

`route_id` and `service_id` were counters that advanced in whatever order the
schedules came back in, so the same timetable could be numbered differently from
one run to the next and was numbered differently by different sources. `route_id`
now comes from a sort of the route's name - operator, origin, destination, mode -
and `service_id` from a sort of the calendar's date range, day mask and
exclusions.

Every output file is now written in a declared order as well: stops by `stop_id`,
trips by `trip_id`, stop times by `(trip_id, stop_sequence)`, and so on.

**Identifiers and row order both change with this release.** The content does not:
the same trips, calendars and stop times are present, numbered and ordered
differently. Anything storing `route_id` or `service_id` from a previous feed has
to re-read them - which is what GTFS expects of a dataset-internal id, but worth
knowing before you upgrade.
