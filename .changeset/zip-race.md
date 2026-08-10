---
"dtd2mysql": patch
---

Stop `--gtfs-zip` producing a truncated feed.

The build wrote each file through a CSV writer piped into a file and waited on
the writer, which finishes when it has handed on its last row rather than when
the row is on disk. A one second sleep stood in for the difference. That is not
long enough to flush a 164 MB `stop_times.txt`, so the archive could be sealed
around a partial file with nothing to indicate it.

The output now waits for the files themselves, and the zip is written in process
and awaited, so the command returns only once the archive is complete.
