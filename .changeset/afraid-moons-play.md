---
"@gb-rail/dtd-source": minor
"@gb-rail/gtfs": minor
"@gb-rail/gtfs-output": minor
"dtd2mysql": minor
"dtd2gtfs": minor
---

Build a GTFS feed with no database, and give the build a clock.

`dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip` reads the DTD files directly
and produces the same feed `dtd2mysql --gtfs` does from the same files, without a
database anywhere in the tree. Pass `--source` more than once to apply a full
refresh and then its incrementals.

`dtd2mysql` gains `--today` and `--range`, and `GTFS_TODAY` alongside `GTFS_RANGE`.
`--today` fixes the date the build covers, so a feed can be regenerated tomorrow
and compared to the one generated today; without it the output is a function of
the day it ran.

`--range` also fixes a live bug. `GTFS_RANGE` only ever reached the passenger
schedule query: the replacement bus and association queries hardcoded three
months. `GTFS_RANGE=6 MONTH` produced six months of trains with three months of
associations - on the current feed, 93,348 extra schedules against 846
associations silently dropped. All three now derive their window from one value.
At the default of three months the output is unchanged.
