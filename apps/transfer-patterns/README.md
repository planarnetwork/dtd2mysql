# transfer-patterns

Builds the transfer pattern file the nightly feed publishes as `transfer-patterns.br`.

A transfer pattern is the sequence of stations a journey calls at — where it starts, where it
changes, where it ends. Hannah Bast's
[transfer pattern journey planner](https://ad.informatik.uni-freiburg.de/files/transferpatterns.pdf)
plans a journey by looking up the patterns between two stations and pricing only those, which is
fast because the patterns were found in advance. Finding them is what this does.

The algorithm is [raptor](https://github.com/planarnetwork/raptor)'s, and so is the file format.
This exists because a whole national feed is too much work for one CI job: it splits the scan into
shards that can run as separate jobs and merges their output back into the single file raptor would
have written.

Not published to npm. The nightly is the only caller, and the reader is
[`transfer-pattern-planner`](https://github.com/planarnetwork/transfer-pattern-planner).

## Usage

```
transfer-patterns plan <gtfs.zip> --out <shard.br> [options]
transfer-patterns merge <shard.br>... --out <transfer-patterns.br>
```

`plan` scans the feed and writes the patterns it found, sorted and free of duplicates. `merge`
folds the shards of a run into one file of the same shape — merging one shard is a valid run, and
so is planning the whole feed in one go and never merging at all.

```
# the whole feed, on this machine
transfer-patterns plan gtfs.zip --out transfer-patterns.br

# a sixth of it, as the nightly does
transfer-patterns plan gtfs.zip --shard 2/6 --workers 4 --out shard-2.br
transfer-patterns merge shard-*.br --out transfer-patterns.br --meta meta.json
```

### plan

| | |
|---|---|
| `--out <file>` | Where the patterns go. Required. |
| `--dates <list>` | Comma separated `YYYY-MM-DD`. Defaults to the next Tuesday, Friday, Saturday and Sunday. |
| `--shard <n>/<of>` | Plan this shard's share of the stations. Default `1/1`. |
| `--workers <n>` | Threads to scan on. Defaults to two fewer than the machine has cores. |
| `--tmp <dir>` | Where the workers' files go. Defaults to a temp directory, removed afterwards. |

### merge

| | |
|---|---|
| `--out <file>` | Where the patterns go. Required. |
| `--meta <file>` | Also write how many patterns there are, as JSON. |

## Dates

A pattern set is built for a date: the network is filtered to the trips running that day, so a
pattern only exists if something ran it.

What varies between one date and the next is mostly the shape of the day rather than the season — a
Sunday has a different service to a Tuesday, and a Friday evening has trains a Tuesday evening does
not — so the default is one date of each shape rather than four consecutive days, which would plan
four Tuesdays and call it coverage.

The patterns of every date are published together. That is the right way round: a pattern the
planner does not hold is a journey it cannot offer, while a pattern whose trains do not run on the
day being planned costs a scan that finds nothing.

## The file

Each line is one pattern: the stations it calls at, three characters each, nothing between them.

```
LSTNRW            Liverpool Street to Norwich, direct
LSTCBGNRW         changing at Cambridge
LSTCBGELYNRW      changing at Cambridge and Ely
```

The two ends are written in alphabetical order, so a pattern appears once for both directions of
travel and a journey from Norwich is found under `LST`, read the other way.

Sorting puts patterns that begin the same way together, so a line only records how many leading
stations it takes from the line above and what follows it:

```
0LSTNRW
2CBGNRW           <- LST, then CBG NRW
3ELYNRW           <- LST CBG, then ELY NRW
```

It needs no marker for a pattern that a longer one runs through — `LST CBG NRW` is both a pattern
and the start of `LST CBG ELY NRW` — because every line is exactly one pattern. The file is brotli
compressed.

Because a station is three characters, this needs a feed whose `stop_code` is three characters: a
CRS code, which is what the GB rail feeds use. A code of any other width would run into the station
after it and the whole line would come back wrong, so a run stops rather than writing one.

Read it back with raptor:

```js
const {readPatterns} = require("raptor-journey-planner");

const lines = readline.createInterface({
  input: fs.createReadStream("transfer-patterns.br").pipe(zlib.createBrotliDecompress())
});

for await (const stations of readPatterns(lines)) {
  // ["LST", "CBG", "NRW"]
}
```

## How a run is split

The scan is the parallel part: one station at a time, independent of every other, a few hundred
core-seconds per day planned across a national feed. Work is pulled rather than dealt out, because
Waterloo takes seconds where a request stop takes a tenth of one and a pool that split the list up
front would spend most of its time waiting for whichever worker drew the terminals.

A shard is a stride through the sorted stations rather than a block of them, for the same reason:
blocks follow the alphabet, and `LST`, `LBG` and `LIV` in one block would leave that job running
long after the others finished.

Each shard merges its own workers' files before it uploads anything. The same station on four days
finds largely the same patterns, and that is where those copies go — it is the difference between
moving tens of megabytes between jobs and moving gigabytes.

The final merge is the one stage that cannot be split: every pattern goes through it. Because the
shards arrive sorted and free of duplicates it is a streaming k-way merge rather than another sort,
so it holds one pattern per shard rather than a bucket of them.

Measured on a national feed of 3,014 stations, six shards:

| | one date | four dates, as the nightly runs it |
|---|---|---|
| Patterns | 34,557,853 | 52,440,684 |
| File | 32.5MB | 52.5MB |
| A shard's file | 7.2 – 7.7MB | 11.6 – 12.2MB |
| Final merge | 3m16s, 242MB | 4m55s, 250MB |

The one date figure is the same count, to the pattern, that raptor's own unsharded CLI produces
from the same feed — which is what says the sharding and the merge lose nothing.

Four dates rather than one is half as many patterns again, which is the argument for planning more
than one day: a Saturday is not a thin Tuesday, it is a different railway. The final merge grows
with the days planned and the shards do not, because it is the only stage that sees all of them.
