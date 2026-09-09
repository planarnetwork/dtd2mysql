---
"@gb-transit/gtfs-schema": minor
"@gb-transit/gtfs-loader": minor
"gtfsmerge": minor
---

Keep the blocks, the shapes and the frequencies a bus feed has.

`trips.txt` dropped `block_id` and `shape_id` as something "a merge has nothing to put in". That was
true of two rail feeds and is not true of a bus feed, where both are populated — and dropping
`shape_id` is what made `shapes.txt` impossible to carry, since nothing would have referenced it.

Both are now kept, and both are renumbered rather than carried across. A block is one vehicle
working through a day and a shape is one line on the ground, each named by the feed that published
it and by nobody else, so two feeds numbering a block `1` do not mean the same vehicle. Carried
across unchanged they would say a bus continues as a train.

`shapes.txt` is read in the same pass as the calls, because it needs the same thing to have happened
first — the trips renumbered — and it is streamed for the same reason they are: a national bus feed's
shapes.txt is 2.5GB, more than the calls. A shape no surviving trip is drawn along is dropped.

`frequencies.txt` is held rather than streamed, because the whole national bus feed has 81 of these
rows, and each is renumbered onto its trip's new id or dropped with a trip that did not survive.

`frequencies.txt` was not a file `@gb-transit/gtfs-schema` or `@gb-transit/gtfs-loader` knew about.
Both now do: the schema gains `Frequency`, `FrequencyRow` and the file's columns, and the loader
reads it.

Merging the published rail feed with the Bus Open Data Service's Wales feed now produces fourteen
files rather than eight, and every reference in it — 334,972 trips, 4,561,198 calls, 2,859,358 shape
points, 1,204 area memberships — points at a row that is in the feed.
