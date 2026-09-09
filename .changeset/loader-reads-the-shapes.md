---
"@gb-transit/gtfs-loader": minor
---

Read the line a trip runs over.

`shapes.txt` was one of the files `loadGTFS` did not open, so a feed that carried geometry was read
back without it and nothing built from a loaded feed could draw a trip on a map. Now the feed has a
`shapes` index and each trip a `shapeId`.

The points are sorted by `shape_pt_sequence` rather than taken in file order. GTFS does not require
`shapes.txt` to be sorted — the rail feed's is only sorted because the producer chose to — and a
caller drawing an unsorted one gets a scribble.

A point is latitude and longitude and nothing else. `shape_dist_traveled` is not read, for the
reason the loader already skips four of `stop_times.txt`'s ten columns: nothing drawing a line needs
it, this is the file a national feed has millions of rows of, and a caller that does need it has
`loadGTFS(source, {raw: true})`, which reads every column a file has. That is also the path
`gtfsmerge` takes, so a merge still carries the column through untouched.

`shapes` is `{}` for a feed with no `shapes.txt` and `shapeId` is undefined on a trip that names
none, so nothing changes for a feed without geometry beyond one more empty index.

Every field of a point is checked before it is kept, which the rows around it are not. All four are
load bearing and none is recoverable: `Number(undefined)` is NaN, NaN compares false against
everything, and a comparator that returns NaN leaves the sort unspecified - so a single row with no
`shape_pt_sequence` produces the scribble the sort exists to prevent, silently. A bad point is
dropped; a bad line is not.

Reading the published rail feed back: 241,669 trips, every one of them resolving to one of 12,077
shapes over 176,403 points, and no trip pointing at a shape that is not there.
