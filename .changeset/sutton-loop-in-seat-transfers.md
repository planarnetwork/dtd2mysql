---
"@gb-transit/gtfs": minor
---

Couple the two halves of a Sutton loop working with an in-seat transfer.

A Thameslink service runs out of London via Wimbledon, terminates at Sutton, and starts again from
the same platform two minutes later back towards London via Hackbridge. It is one unit and the
passengers stay in their seats, but the CIF publishes it as two schedules with no association
between them, so the only thing joining them in the feed was Sutton's interchange time — five
minutes, against a two minute turnaround. A journey planner could not use the loop at all.

`reversingTrips` writes those pairs as `transfer_type=4` rows, the same kind `linkedTrips` already
writes for a split or a join, so a reader that already builds a through trip across a coupling
builds one here without being told anything new. `libs/gtfs/src/data/reversal.ts` holds the two
rules — one per direction round the loop — and says why the list is a whitelist: an in-seat transfer
asserts the same unit carries on, which is true of the loop and is not true of every train that
turns round quickly.

A pair is coupled when both trains are the operator the rule names, the first ends where the second
starts, each came in and left by the arm the rule names, both name the same platform there, the
second leaves between one and ten minutes after the first arrives, and their calendars have a day in
common. Neither schedule is narrowed to those days and the row carries no calendar of its own: the
days the turnback happens are the days both trips run, which each trip already says.

Two calls that name no platform are left alone rather than read as one place. `platformOf` answers
null both to a call the source gave no platform and to one that named a running line, so a pair of
nulls is the source saying nothing rather than the source putting two trains on one platform. It
also makes the rule fail closed: if the CIF stops publishing Sutton platforms this writes nothing
rather than inventing couplings, and says so in the build log.

A pair a CIF association already couples is left to `linkedTrips`, whatever stop the association
named, so the two cannot write the same row twice.
