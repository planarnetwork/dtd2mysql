---
"gtfsmerge": minor
---

Add `--no-shapes`, for a merged feed that does not need the geometry.

`shapes.txt` is the line a vehicle is drawn along on a map, and nothing else — no journey planner
reads one, and nothing in this repository consumes them. It is also the largest file a bus feed has:
in a merge of the rail feed and the national Bus Open Data Service feed it is 1.24GB of a 4.31GB
feed, a third of the archive.

It is also asymmetric. Nothing in the CIF describes track geometry, which the published feed says in
as many words, so a merged feed carries geometry for the buses and none for the trains — a map drawn
from it shows buses following roads and trains as straight lines between stations.

So it can be left out, and leaving it out means three things rather than one:

- `shapes.txt` is not opened at all, rather than written empty.
- `shape_id` leaves `trips.txt`, because a column naming a shape that is not in the feed is a
  dangling reference rather than a missing extra. `block_id` stays.
- The reader is never asked for `shapes.txt`, so the 2.5GB in a national feed is read past rather
  than inflated and parsed.

`merge({shapes: false})` on the API. The default is unchanged, so a merge that says nothing about
this produces the feed it always did.
