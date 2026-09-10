---
"gtfsmerge": minor
---

Keep the stop hierarchy, and generate transfers through a grid.

A merge published only stations, moved every call onto them, and cleared `location_type` and
`parent_station` on the way out. So a merged feed could say which station a train called at and not
which platform, and it threw away the grouping a bus feed publishes for its own stops as well as the
rail feed's. Merging the published rail feed with the national Bus Open Data Service feed produced
311,736 stops, every one of them `location_type` 0 with no parent — against BODS London on its own,
which has 24,348 stops, 452 stations and 865 stops that name one.

That grouping is what tells a journey planner that a stand outside a station and a platform inside
it are one place to change at. Without it the only interchange left is where two feeds happen to
share an ATCO code — 1,863 stops out of 311,736 — and everything else has to be rediscovered from
coordinates.

A call now stays where its feed put it, a platform keeps its `parent_station`, a station keeps
`location_type` 1, and a stop is published if something calls at it **or** it is the station above
one that does. The old comment predicted three validator errors; there are none, because the errors
came from moving calls onto stations rather than from publishing stations.

Two things follow:

- **A walk transfer is generated between stations, not between platforms.** A platform's interchange
  is its station's, because `parent_station` already says that reaching the station reaches every
  platform under it. A stop with a station above it therefore takes no part in generation; without
  that, one walk is written once per platform and offered as several journeys.
- **Transfers are generated through a spatial grid.** `addNearbyStops` compared each stop against
  every stop already seen, which over 321,570 stops is 51.7 billion pairs and about four hours — the
  reason a national merge has been run with `--no-extra-transfers` until now. Cells one transfer
  distance wide reduce it to nine lookups per stop.

**A stop code that names more than one station is left out.** A code is kept only where every stop
carrying it is part of one station: swap a stop for its `parent_station` where it has one, and see
whether more than one id is left. Merging the rail feed with the national bus feed, 2,777 codes are
used by more than one stop — 2,740 of them a rail station and its own platforms sharing a CRS code,
which is right, and 37 that are not. Of those, 27 name places miles apart (`74020` is Northlands
Avenue and Borkwood Way) and 10 name two stops of one place the source gives no station to group
them under. Neither kind can tell a rider which stop is meant, so the code goes.

The stops are written by `end` rather than by `write` for that reason: a code can be shared across
feeds, so the answer is not known until the last has been read.

`StopTimesMerger.begin` no longer takes the parent map, since it no longer moves a call.
