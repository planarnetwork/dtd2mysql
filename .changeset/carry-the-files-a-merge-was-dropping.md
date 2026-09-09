---
"gtfsmerge": minor
---

Carry attributions, fare areas and feed info through a merge.

The merge opened eight writers and dropped everything else, so merging the published rail feed with
a bus feed lost four files:

- `attributions.txt`, which is where the Open Government Licence and the Rail Settlement Plan
  licence are stated. NaPTAN's licence makes acknowledgement a condition of use, so a merged feed
  was being published without the one file that keeps it inside its terms — and adding a second
  source is when that file needs another row, not deleting.
- `areas.txt` and `stop_areas.txt`, the GTFS Fares v2 station groups. "London Terminals is these
  eighteen stations" is what they say, and a merged feed could no longer answer it.
- `feed_info.txt`, where a feed says who made it, what it covers and which version it is. The
  validator warns without it.

All four now survive. Attributions are the union of the inputs', deduplicated on the whole statement
rather than on the organisation, because the same body can be the authority for two things under two
licences. A stop area follows the same rules a transfer does: a membership naming a platform is
written as the station above it, and one naming a stop nothing calls at is dropped.

`feed_info.txt` has no answer that is simply correct, since two feeds have two publishers and the
merged one is neither. It takes the publisher of the first input, the widest window across the
inputs, and every input's version joined — `RAIL001+BUS001`. Anything publishing a merged feed as
its own should write this file itself rather than take what falls out here.

The end-to-end test listed the files it checked, so the four could have gone missing again without
anything noticing. It now reads the golden directory and asserts the merge produced exactly those
files.
