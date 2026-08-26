---
"dtd2mysql": patch
---

NaPTAN can supply readable station names, if a config asks for it.

MSN station names are upper case and truncated to sixteen characters, so the
feed calls Newcastle Airport `NEWCASTLE AIRPRT`. The readable names come from a
hand-maintained override file, which is the reason D7 cannot retire it.

D3 declined NaPTAN's names because its `CommonName` is "Aberdare Rail Station"
where the departure boards say "Aberdare". That suffix is the whole of the
objection: strip it and 2,454 of the 2,580 names both sources describe are
identical. Of the 126 that differ, 98 are a parenthesised county qualifier, 6
are case - with NaPTAN the better of the two - and 22 are genuinely different.
`docs/station-names.md` lists every one.

`options: {names: true}` turns it on, off by default because renaming every
station in the feed is a decision to make deliberately. Enricher `options:` was
parsed and then dropped on the floor; it now reaches the enricher.
