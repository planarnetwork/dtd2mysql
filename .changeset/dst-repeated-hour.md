---
"@gb-transit/gtfs": minor
"dtd2mysql": patch
"dtd2gtfs": patch
---

Keep the trains that run in the repeated hour of the autumn clock change on the day they run.

On the last Sunday of October 01:00 to 01:59 happens twice, once in BST and again in GMT.
`shiftLateNightServices` moves anything departing before 02:00 onto the previous service day, which
reads every such departure as the first pass. That is right for a service day that ends before the
change, and wrong for one that runs through it: an 01:05 GMT departure is 26:05 of the Saturday
service day, and telling it as 25:05 puts it alongside the train that already ran an hour earlier.

The London Overground night service is the only one in Great Britain that runs through the change,
and it covers the repeated hour with short term plan schedules dated to that Sunday alone - four in
each direction between Highbury & Islington and New Cross Gate, signalling IDs starting `9Z`. A
schedule of that shape - operator `LO`, not permanent, departing between 01:00 and 01:59, and
running on the last Sunday of October and no other day - is now left where its own record dates it.
The standard schedules cover the first pass and are shifted as before.

`ScheduleCalendar.runningDates()` is new: the dates a calendar actually runs, as a generator.
`isEmpty` is now asking it whether there is a first one.

Closes #165.
