---
"dtd2mysql": patch
---

Add the seam external data sources plug into.

The core build turns the DTD into GTFS and nothing else. Real coordinates,
step-free access and station groups come from elsewhere, each with its own
licence and its own idea of what a station is. An enricher is one of those
sources, and it writes through a ledger: every change has an author and a
declared priority, higher priority wins whatever order they ran in, and every
write that lost is kept in `provenance.json` so "why does the feed say that" has
an answer.

No enricher is configured yet, so the feed is unchanged.

A build can also be described in a `gtfs.config.yaml` and run with
`dtd2gtfs build --config`, which is how a nightly gets to differ from yesterday
by a diff somebody approved rather than by an edited command line.

Station coordinates come from NaPTAN when it is enabled. 2,622 of 3,054 stations
match; the rest are buses, trams, ferries and Underground stops that NaPTAN's
rail records do not cover. Most stations move a couple of metres, a few by
kilometres.
