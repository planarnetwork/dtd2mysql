---
"@gb-transit/gtfs": minor
"@gb-transit/dtd-source": minor
"cif2gtfs": minor
"dtd2mysql": minor
---

Draw every trip as a line through the stations it passes.

The feed publishes `shapes.txt` and a `shape_id` on every trip. The line runs through every station
a train touches — calling or running through — which is what makes it worth drawing: on the calls
alone a King's Cross to Newcastle service is a single 395 km straight line, and with the passing
points it is twenty-odd hops that trace the East Coast Main Line. Across a national feed it takes
the straight-line hops longer than 50 km from 4,751 down to 404, and the 99th percentile hop from
74 km to 37 km.

**It is a sketch of the route, not the track.** 2,170,472 of the CIF's 3,062,488 passing points are
junctions, loops and signal boxes and the DTD gives no coordinate for any of them, so what is left
is station to station. The median hop is a 4.8 km straight line over ground the rails curve across.
Enough to tell a Bristol train from a Birmingham one on a map; not enough to draw the railway.
`Shapes.ts` says so, and so does the published documentation, because a consumer who mistakes this
for geometry will draw trains through fields.

A shape belongs to the ground, not the train. One line carries every stopping pattern that runs
over it, so a national feed has 13,722 shapes for 278,794 trips, and the id is twelve hex characters
of a digest of the stations it runs through — the same id in every build, so something outside the
feed can refer to a line by it.

`Schedule` gains a `path`: every timing point, kept apart from the calls so that nothing about a
route, a headsign or a coupling can start depending on a station the train does not stop at. It
survives `clone` unchanged, because a schedule cut to other days is the same train over the same
ground.

The two places that rebuilt a schedule field by field - `mergeSchedules`'s `withTripId` and
`CifFileSource`'s `offsetId` - now go through `clone` instead. Both were listing nine of a
schedule's ten fields to change one, which is nine chances to forget the tenth, and `offsetId`
duly forgot `path` the day it was added. Nothing caught it: the argument is optional, so the call
compiled, and a z-train with no path draws its shape from its calls - the same list, until a ZTR
carries a pass time.

`removePassingPoints` moves from the sources to `ScheduleBuilder`. The passenger query and the CIF
read now hand over every location either way — 3.8 million rows rather than 2.9 million — and the
builder decides which of them become stop times. That is what makes **both** published feeds carry
the identical `shapes.txt` whether or not they publish the passes as calls, which the nightly checks
with `cmp` before releasing.

`gtfs.zip` grows by 1.73 MB, 9.6%. That is measured rather than estimated: the same build zipped
with the shapes and with them stripped out, over RJTTF918 alone — 241,669 trips, 12,077 shapes,
176,403 points, and every one of those trips drawn. `shapes.txt` is 6.3 MB of it before compression
and the rest is the id on the trips. Coordinates are written to six decimal places — eleven
centimetres, against a line already wrong by kilometres wherever the track bends.

No `shape_dist_traveled`: GTFS only reads one where `stop_times.txt` carries it too, and putting a
distance on 2.9 million calls is not worth it. The validator raises no new notice of any kind on the
real feed with the shapes in it — not one `stop_too_far_from_shape`, not one
`stops_match_shape_out_of_order` — so the baselines are unchanged.

The MySQL import reads the file it has always had a table for. `shapes` was created empty because
"this feed has no geometry to put in it"; it now loads, with a `char(12)` id, a
`(shape_id, shape_pt_sequence)` key and a `smallint` sequence, none of which the stub had right.
`trips` gains a nullable `shape_id`.
