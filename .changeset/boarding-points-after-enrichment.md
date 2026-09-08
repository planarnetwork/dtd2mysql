---
"@gb-transit/gtfs": patch
---

Make the boarding points after the stations are final, not before.

A station with platforms is published as a station row and a boarding point beneath each platform
a train calls at, and each boarding point is a copy of its station with an id, a name and a platform
code of its own. The copies were taken before the enrichers ran. An enricher is handed the stations
alone — a source that knows where Clapham Junction is should not have to know it has sixteen
platforms — so NaPTAN's surveyed position landed on the station and the copies underneath kept the
DTD's rounded grid reference. Two rows for the same place, disagreeing, and `stop_times.txt`
references the stale one.

NaPTAN and the override file differ by more than 100 metres at 125 stations and by up to 3.2km, so
that is the error a journey was planned from. It would have grown: retiring the override file leaves
the boarding points on a grid reference rounded to 100 metres while their stations take NaPTAN.

The stations are now enriched first and everything derived from them follows: the boarding points,
and the headsigns, which named a train after the station as the DTD left it. Both now say what the
station says. The boarding points are also derived from the schedules the feed publishes rather than
from the schedules as they arrived, so a call dropped for referencing a station that is not in
`stops.txt` no longer leaves a boarding point behind that nothing references.

An extension still reads the whole feed, boarding points included. `MutableFeed.stations` is
unchanged and enrichers see exactly what they saw before.
