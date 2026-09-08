---
"@gb-transit/gtfs-loader": minor
---

Read the operator, the trip names, the transfer mode and the areas.

A feed loaded as a timetable could say which trip a journey was on and nothing else about it. Four
files were never opened and four columns of two that were went unsliced, so who ran a train, what
it was called, and how a change between two stations was made all had to be recovered by reading
the zip a second time.

`GTFSFeed` gains `routes`, `agencies` and `areas`; `Trip` gains `routeId`, `shortName` and
`headsign`; `Transfer` gains `mode`. Nothing an existing caller receives changes shape, and a feed
missing any of these files loads as before with the indexes empty and the fields undefined.

`areas.txt` and `stop_areas.txt` are one index rather than two, because neither is any use without
the other. Either may arrive first — this feed writes `stop_areas.txt` ahead of `areas.txt` — so
both sides fill in an entry the other may already have made.

The cost is 9MB on a 290MB load of the GB feed, and no measurable time. That is small because all
three trip fields go through `intern`: 290,640 trips name 98 routes and 869 headsigns between them.
`trip_short_name` is the headcode and barely repeats, but a field is a slice of the chunk it was
decoded from and 290,640 of them would hold the whole of an 18MB `trips.txt` alive, so it has to be
copied out either way. Interning it costs a lookup and recovers the two thirds that do repeat.

`agency_id` is handed back exactly as the feed wrote it, `=GW` and not `GW`. The equals sign is the
National Operator Catalogue form that tells a rail operator from the airline with the same two
letters, so stripping it would reintroduce the collision it exists to prevent and leave the ids
disagreeing with the ones `@gb-transit/gtfs` composes.

`mode` is the raw string, with `transferModes` to split it. The compound form is the sorted union of
every link describing a stop pair, since `transfers.txt` is keyed on the pair and can hold one row
for it, so `BUS|WALK` means the change can be made either way rather than that the bus comes first.
Which one a journey should be shown as depends on what the caller is optimising, and the feed has
not ranked them. It travels with a footpath between two stops and nowhere else: a same-stop row
becomes that stop's interchange time, and a type 4 row becomes a coupling.
