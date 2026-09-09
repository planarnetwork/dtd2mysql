---
"gtfsmerge": major
---

Remove `--stop-prefix`.

The flag prepended a prefix to every stop id, for merging feeds that do not share an id space. It
did not work, and had not for as long as it has existed: merging the published rail feed with it
produces a feed with **no stops at all**.

```
gtfsmerge --stop-prefix x_ gtfs.zip out.zip
  stops.txt         0 rows
  stop_times.txt    2,991,962 rows, every one of them pointing at a stop that is not in the feed
```

`FeedIndex.stop` prefixed a stop it published, and recorded a platform's parent station under the
unprefixed id:

```ts
else {
  this.result.parentStops[row.stop_id] = row.parent_station;   // neither prefixed
}
```

Everything that reads that map has been prefixed by then, so a call at a platform never found its
station and kept the platform's id — an id that is never published, because a platform is not a stop
the merged feed writes. `usedStops` then held platform ids while the stops to publish were stations,
the two sets did not intersect, and the test that decides which stops to write matched none of them.
The rail feed has 9,257 platforms.

It could have been fixed with two more prefixes. It is removed instead, because nothing needs it: GB
feeds all name a stop by its ATCO code, which is the whole reason a rail feed and a bus feed from
this repository merge without reconciliation, and no test has ever exercised the flag.

**Breaking:** `MergeOptions.stopPrefix` is gone, and `MergeCommand.run` no longer takes it. Feeds
that disagree about what a stop id means have to be reconciled before they reach a merge.
