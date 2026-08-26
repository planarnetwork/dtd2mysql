---
"dtd2mysql": patch
---

Publish station entrances, so the feed knows where the doors are.

A station in this feed was one point, which is the point a schedule calls at. A
rider arriving on foot needs the door, and a large station has several in
different streets. NaPTAN records 4,308 of them under the Open Government
Licence; 3,371 land in the feed, across 2,019 of 3,056 stations, as
`location_type=2` stops under their station.

The join is by name and **verified by distance**. Entrance ATCO codes are
locality-prefixed rather than `9100` plus a TIPLOC, so unlike the coordinates
there is no identifier to join on. Exact names match 71% and normalising the
"Rail Station" / "Railway Station" / "Station" suffixes gets 86%, of which
3,305 of 3,536 sit within 100 m of the station they matched. The distance check
is what makes the name match safe: without it a NaPTAN record positioned 574 km
from Oakham attaches to Oakham and nothing says so.

`MutableFeed` gains `add()` for this - the narrow exception to "an enricher does
not create stops". It can only extend the hierarchy beneath a station that
already exists, so an enricher can describe a station the feed has in more
detail and cannot invent one the timetable never mentioned. The addition is
recorded in `provenance.json` like any other write.

Off unless a config asks for it.
