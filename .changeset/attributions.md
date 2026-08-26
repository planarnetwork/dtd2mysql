---
"dtd2mysql": patch
---

Credit the sources the feed is built from, in `attributions.txt`.

NaPTAN is Open Government Licence v3.0, and the licence makes acknowledgement a
condition of use rather than a courtesy. Since NaPTAN was turned on for the
nightly the feed had carried DfT survey coordinates with nothing crediting the
DfT, which is a feed published outside its licence.

Each enricher and extension already declared an `attribution` - who the source
belongs to, on what terms, and whether the licence is share-alike - and nothing
read it. Now every one that runs becomes a row, along with the timetable itself,
which is not an enricher and so declares nothing: a feed that credits the source
of its coordinates but not the source of its trains reads as a complete list and
is not one.

The declaration stays on the enricher rather than in a list kept centrally,
because the thing that knows a source's licence is the code that fetches it. A
central list goes stale the first time somebody adds a package and forgets, and
the failure is silent.

`attribution_licence` is a producer extension. The spec has `organization_name`
and a URL and no field for the terms, which is the one thing an attribution
statement has to say; the alternative was to bury it in `attribution_url` where
nothing could read it.
