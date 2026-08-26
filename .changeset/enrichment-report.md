---
"dtd2mysql": patch
---

Publish what the sources actually did, and let the page say who they are.

`enrich()` printed matched, unmatched and conflicts to the console and nowhere
else, so the one number D1 was designed around - the unmatched count a source is
tempted not to report - survived only in a workflow log that expires in a
fortnight. Nobody was ever going to compare last month's against this month's.

The build now writes `enrichment-report.json` beside the feed: what each
enricher and extension matched, missed and dropped, with their notes, and the
sources the feed is built from. It is attached to the release rather than zipped
into the feed, alongside `validation.json`. Distinct from `provenance.json`,
which answers "why does this feed say that" in thousands of entries; this
answers "did the sources work".

The download page's sources list was hardcoded to one line naming the Rail
Delivery Group. It now renders whatever the feed was actually built from, so
turning an enricher on credits it without anybody remembering to edit the site -
which matters because NaPTAN is OGL and acknowledgement is a condition of use,
not a courtesy. A release published before the build declared its sources falls
back to naming the timetable rather than showing an empty list.
