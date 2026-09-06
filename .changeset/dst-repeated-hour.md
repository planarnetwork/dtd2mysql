---
"@gb-transit/gtfs": patch
"dtd2mysql": patch
"dtd2gtfs": patch
---

Keep the trains that run in the repeated hour of the autumn clock change on the day they run.

On the last Sunday of October 01:00 to 01:59 happens twice, once in BST and again in GMT.
`shiftLateNightServices` moves anything departing before 02:00 onto the previous service day, which
reads every such departure as the first pass. That is right for a service day that ends before the
change, and wrong for one that runs through it: an 01:05 GMT departure is 26:05 of the Saturday
service day, and telling it as 25:05 puts it alongside the train that already ran an hour earlier.

The London Overground Windrush line is the only service in Great Britain that runs through the
change, and it covers the repeated hour with short term plan schedules dated to that Sunday alone -
four in each direction between Highbury & Islington and New Cross Gate. A schedule of that shape -
operator `LO`, on the Windrush line, not permanent, departing between 01:00 and 01:59, and whose own
record is dated to the last Sunday of October and nothing else - is now left where that record puts
it. The standard schedules cover the first pass and are shifted as before. The count is logged when
it is not zero, because the rule is expected to stop matching if the operator changes how it
publishes these.

`Association.apply` now asks whether the shift will move the schedule of `asDated` rather than of
`assoc`. `asDated` is the one that reaches the shift, and it carries the calendar `coupled` has just
narrowed, which is what the answer now depends on.
