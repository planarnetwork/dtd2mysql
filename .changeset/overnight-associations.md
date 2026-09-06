---
"@gb-transit/gtfs": major
"dtd2mysql": major
"dtd2gtfs": minor
---

Publish an overnight associated schedule once, on the day its own record dates it.

A schedule that runs the day after its base was published twice: once told in the base's service
day, at times past 24:00, and once on the day its own record gives. Both are the same train, so a
departure board built from the feed showed it leaving twice, and the copy told in the base's day was
the one a coupling named. Over three months of the whole network that is 108 trips and 1,057 stop
times, measured against RJTTF847/918; the mini fixture goes from 150 trips and 1,590 stop times to
128 and 1,326.

The associated schedule now stays where its own record puts it and the transfer names it there.
GTFS does not ask the two trips a coupling names to run on one service day - a transfer carries no
calendar, and `to_trip_id` is defined against the stop rather than the start of the trip - so a
coupling that happens over midnight is now read as one, and the Aberdeen portion of the sleeper is
the Tuesday 04:28 out of Edinburgh rather than a Monday 28:28.

**Breaking for consumers whose planner cannot follow a transfer across a service day.**
`--duplicate-overnight-associations`, `duplicateOvernightAssociations: true` in a config, or
`GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS=1` publishes the copy as well and points the coupling at it,
which is the previous behaviour. It is off by default, and a feed built with it carries the same
train twice on purpose.

**Breaking for `@gb-transit/gtfs`.** `applyAssociations` and `Association.apply` take the setting as
a further argument. `AssociationApplication` replaces `associated`/`asDated` with `asDated`,
`duplicated` and `unassociated`, which say which of the three copies each one is rather than leaving
two of them to overlap. `addLateNightServices` is now `shiftLateNightServices`, and no longer takes
an `IdGenerator`: it replaces each schedule with the shifted copy, which keeps the id it was given.
`Schedule.copyToPreviousServiceDay` is the one implementation of the day shift both it and an
overnight duplicate use.
