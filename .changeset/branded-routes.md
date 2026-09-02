---
"dtd2mysql": patch
"@gb-transit/gtfs": minor
---

Publish routes as the brands a passenger sees, with stable ids.

A route used to be one operator's journey between two places - `SE:TON->SEV:2` -
numbered in the order the routes were written, so `routes.txt` ran to thousands
of rows and a `route_id` meant nothing outside the build it came from. A route
is now the brand on the departure board: `GW` is Great Western Railway, `WIN` is
the Windrush line, `SX` is the Stansted Express. The id is worked out from the
schedule, so it is the same id in every build and can be referred to from
outside the feed.

`route_short_name` and `route_long_name` are the operator's own names for the
brand, `route_color` is the colour it uses on a route map and
`route_text_color` is black or white, whichever can be read on it. The six
operators that run more than one line - London Underground, the Overground,
Merseyrail, the Tyne & Wear Metro, West Midlands Trains and Greater Anglia's
Stansted Express - have their line worked out from where the service calls;
`libs/gtfs/src/data/route.ts` holds the rules and the branding, and is the one
file to edit when a brand changes. Buses and replacement buses keep routes of
their own, because neither runs on the line its operator's trains do.

`route_desc` is no longer written. It carried the class and reservation
availability of a train, which is a property of the train and not of the line it
runs on: trips sharing a route disagreed about it.

For a consumer of `@gb-transit/gtfs`: `RouteID` is a string rather than a
number, `Trip.route_id` with it, and the optional fields of `Route` are `null`
rather than `undefined`, as everywhere else in the feed. `Schedule.toTrip` no
longer takes a route number, and `Schedule.routeShortName` is `Schedule.routeId`.

An operator the build has no agency for keeps its ATOC code, so it gets a route
of its own named after that code and attributed to the catch-all `ZZ` agency.
That route keeps its id when the agency list catches up with the operator, which
is the case a stable id is for: `LF` ran before the software knew about Lumo
(West Coast).
