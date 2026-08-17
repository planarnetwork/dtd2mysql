---
"dtd2mysql": minor
---

Give the GTFS build a clock, and honour the range everywhere.

`--today` fixes the date the build covers, so a feed can be regenerated tomorrow
and compared to the one generated today; without it the output is a function of
the day it ran. `--range` sets how far ahead to build. Both are also read from
`GTFS_TODAY` and `GTFS_RANGE`, and the flags override the variables.

`--range` fixes a live bug. `GTFS_RANGE` only ever reached the passenger schedule
query: the replacement bus and association queries hardcoded three months, so
`GTFS_RANGE=6 MONTH` produced six months of trains with three months of
associations - on the current feed, 93,348 extra schedules against 846
associations silently dropped. All three now derive their window from one value.
At the default of three months the output is unchanged.
