---
"gtfsmerge": patch
---

Make a merged calendar say what the feed it came from said.

A service the feed describes only by its exception dates has no calendar row to carry across, so
`CalendarFactory` works one out from the dates. It read every date as a date the service runs on:

```js
if (calendarDateIndex[i]) {          // presence, not exception_type
  daysRunning[dow].push(...)
```

A feed lists both the dates a service runs and the dates it does not, and the second kind was being
read as the first. Merging the published rail feed with the Bus Open Data Service's Wales feed, 1,613
trips came out running on days they do not run, and the days they gained were 24, 25, 26 and 28
December, New Year's Day and Easter — the bank holidays an operator writes down as removals. Across
the national bus feed it is 959 services and 26,908 days.

None of it showed on a rail feed, because every service in the CIF has a calendar of its own and the
synthesised path is never reached. It is reached 1,489 times by the national bus feed.

Four fixes, all in the calendar:

- Only an addition is a date the service runs on. A removal now falls where it belongs, among the
  days the service does not run, and comes back out as an exclusion wherever the calendar's own days
  would otherwise include it. The range is taken from the dates it runs rather than from every date
  mentioned.
- A service whose dates are all removals never runs, and used to build a calendar out of whatever
  those dates happened to be. It gets a calendar of no days.
- A service that runs on no day at all is dropped, along with its trips and their calls. A feed says
  this in more than one way — a calendar naming no day, a range whose every running day is excluded,
  nothing but removals — and none of them can be planned onto. The Wales merge carried 78 such trips.
- `getCalendarHash` compared the exception dates in the order the feed listed them, so two identical
  services written down in a different order stayed two services. They are sorted first.

`CalendarFactory` now steps between dates with `addDays` from `@gb-transit/gtfs-loader`, which works
in UTC so that a clock change cannot move a date onto the day either side of it, rather than with a
local-time `Date`. `toGTFSDate` stays where it is and stays local: it answers "what is today" for the
default `--date-filter`, which is a question about the caller's day.

Checked by merging the rail feed with BODS Wales and comparing the exact set of dates every one of
the 334,972 trips runs on, before and after: every trip runs on exactly the days it ran on.
