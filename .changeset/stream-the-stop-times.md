---
"gtfsmerge": minor
---

Read a feed's stop times in a pass of their own, rather than holding them.

A merge held every input feed whole, and `stop_times.txt` is almost all of a feed. Held the way the
merge held them, one national bus feed's 59,129,908 calls cost 18.0GB against 0.7GB for the
1,854,991 rows of everything else — 96% of the memory for one file. Merging that feed with the
published rail one peaked at 22.1GB and ended, at the 8GB `bin/gtfsmerge.sh` allows:

```
Loading rail.zip / Processing rail.zip / Loading bus.zip
FATAL ERROR: Ineffective mark-compacts near heap limit - JavaScript heap out of memory
```

The order the merge already worked in is why they need not be held at all. Nothing can be done with
a call until its trip has been numbered, and the trips are numbered from the routes and calendars;
nothing needs the call afterwards. So `readMergeInput` now reads everything but the stop times, and
`stopTimesOf` reads the file again for those alone, handing each call to `StopTimesMerger` to remap
and write as it arrives.

The second read is what this costs, and it is a read of a file rather than a copy of it in memory.

`GTFSOutput.write` takes a `StopTimeReader` alongside the feed, and `GTFSZip` no longer has a
`stopTimes` field. Anything embedding gtfsmerge rather than running it will notice; the CLI is
unchanged.

Backpressure moved with it. The rows of a chunk arrive from a synchronous parser that cannot be made
to wait for a writer partway through, so a chunk's calls are collected and written between one chunk
of the zip and the next, which is where the reader can be paused. A feed's last calls arrive after
its last chunk, as the inflater and the parser give up what they were holding, and are written after
the read rather than lost.
