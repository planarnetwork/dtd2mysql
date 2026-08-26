---
"dtd2mysql": patch
---

Keep the feed releases worth keeping.

A release a day, each carrying a 20 MB zip, accumulates forever. The last month
is what anybody fetches; past that what is wanted is the ability to say what the
feed looked like in April, and one release a month answers that as well as
thirty do. The nightly now keeps the last 30 dailies plus the earliest release
of each month.

The earliest of the month rather than whichever is dated the 1st, so a night
that failed to publish does not cost the whole month its record.

The selection is a pure function with tests. A rule that deletes published
artifacts should not be discoverable only by watching it run, and it considers
`feed-` tags alone: the npm version tags share the release list, and a pruner
that could reach them is one bad regular expression from deleting a release of
the software.

`provenance.json` is attached to the release too, alongside the validation and
enrichment reports. All four describe the feed rather than being part of it, so
they are assets rather than zip contents - somebody unzipping a GTFS feed should
get GTFS.
