---
"@gb-transit/dtd-source": minor
"@gb-transit/gtfs": minor
"dtd2gtfs": minor
"dtd2mysql": minor
---

Add `--remove-passing-points`, which defaults to `true`, so the feed is unchanged by default.

Half the CIF's intermediate location records are places a service runs through without stopping,
and 892,000 of them are at a station the feed publishes. They have always been dropped at the source
query, so the only calls with no pickup and no drop off in the feed were the 4,800 operational stops
where a service stops but nobody boards.

`--remove-passing-points=false`, `removePassingPoints: false` in a config, or
`GTFS_REMOVE_PASSING_POINTS=0` keeps them, as calls with `pickup_type` and `drop_off_type` of `1`
and the pass time as both the arrival and the departure. Over three months of the whole network that
is 3.43 million stop times against 2.84 million. Trips, routes and calendars are identical;
`stops.txt` gains 59 stops. A passing point names its platform like any other call, falling back to
the station where the pass record gives none: 89% of passing calls land on a boarding point the feed
already publishes because something stops there, so the id a passing call carries is the one a
stopping call at that platform carries.

Fixes a bug it uncovered: where two of a service's timing points share a CRS, the one that boards or
alights wins, but a request stop has `pickup_type` 3 rather than 0 and so had nothing to win with. 28
of them were displaced by the point the service passes on the way in.

The nightly workflow now publishes both feeds, `gtfs.zip` and `gtfs-passing-points.zip`, each gated
by its own validator baseline.
