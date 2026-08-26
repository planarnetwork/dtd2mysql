---
"dtd2mysql": patch
---

Publish RDG group stations as GTFS Fares v2 `areas.txt` and `stop_areas.txt`.

A group station is a set of stations a ticket is valid to or from - `1072`
"London Terminals" is Euston, Waterloo, King's Cross and fifteen others - and a
rider holding one needs to know which stations that is.

GTFS has no station-of-stations: `parent_station` is forbidden on a station and
the hierarchy is one level deep, so a group cannot be modelled as nesting.
`transfers.txt` is the wrong tool too, because it asserts you can walk between
the stops, which is false for Euston and Waterloo. An area is a flat set with no
nesting rules and no exclusivity, so a station can sit in London Terminals and a
travelcard zone at once - which is what the source data actually says.

Areas are published under the four digit NLC, the identity the rest of the rail
industry uses and the one the timetable feed already carries as the `TI`
record's `nalco`.

This arrives through a new `Extension` seam, alongside the existing `Enricher`.
An enricher improves an entity the DTD already produced; an extension
contributes whole files the core build has no concept of. Neither can do the
other's job, and an extension gets a read-only view of the feed rather than the
ledger, because field-level provenance means nothing for a file that has no
prior value to lose.

Off unless a config asks for it, so the feed is unchanged by default.
