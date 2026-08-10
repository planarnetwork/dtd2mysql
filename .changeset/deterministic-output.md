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

**Identifiers and row order both change with this release.** The trips, calendars
and stop times are the same; they are numbered and ordered differently. Anything
storing a `route_id` or `service_id` from a previous feed has to re-read them,
which is what GTFS expects of a dataset-internal id but is worth knowing before
you upgrade.

One piece of content changes with them. `route_desc` says whether first class is
available, which is a property of a train rather than of the line it runs on, and
trips on the same route can disagree - **352 of the 6,184 routes do**. Whichever
trip reached the route first used to decide it; now the description that sorts
first does. The value was arbitrary either way, but it no longer depends on the
order the rows came back in. Nothing else about a route changes.
