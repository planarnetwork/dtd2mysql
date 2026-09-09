---
"gtfsmerge": patch
---

Take a review of the merge.

**An option nobody knows is now an error.** `positionalArgs` treated any unrecognised `--flag` as a
flag without a value, so its value became an input feed: `gtfsmerge --stop-prefix x_ a.zip out.zip`,
the invocation the last release removed, merged a feed called `x_` and failed on a missing file
rather than on the option. It now says `Unknown option --stop-prefix`, which is what every future
removal wants too. A run with no feeds to merge prints the help rather than failing on an undefined
output.

**A membership is checked against the whole merged feed.** `stop_areas.txt` dropped a membership
naming a stop nothing calls at, but decided that against the feed being written rather than the
merged one — so the rail feed naming a stop only the bus feed serves lost the membership while the
stop itself was published. They are filtered once, at the end, against every feed's calls.

**An area named twice is reported once.** The collision warning fired per row, which a bus feed
publishing Fares v2 over four digit NLCs would turn into thousands of lines; it counts and reports
in `end`, as the shapes one does. It also used a nullish assignment, so an area whose name is an
empty string was treated as never seen and every later feed appeared to disagree with it.

**Two attributions that say the same thing collapse.** The dedup key was `String(field)` joined,
where an absent field is the word `null` or `undefined` depending on how it arrived, so the same
statement could survive twice — and a comma inside a licence could run two different statements
together.

**A calendar naming no day is dropped without walking its range.** `runsAtAll` stepped a day at a
time through a range it was going to reject, which for the synthesised calendar of a service that is
nothing but removals is however far apart those removals are.

Also: `CalendarFactory` no longer computes a date range for a calendar that never runs and nothing
reads, `FeedIndex.stopArea` no longer carries a comment describing what another class does, and five
lines that ran past the width this codebase wraps at are wrapped.
