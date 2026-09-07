# Baseline changes

Every movement in `fixtures/mini/golden` is written up here, with what changed
and why, so a diff in review can be checked against a reason rather than taken on
trust. CI fails a pull request that moves a golden without adding an entry.

## Absorbed into the monorepo

`fixtures/mini/golden` is new. transxchange2gtfs had no fixtures of any kind and
no test that constructed a `Converter` or produced a feed — `Converter`,
`FileStream`, `GetStopData`, `cli` and `Container` had zero coverage between them.

The feed differs from what the standalone tool produced, in these ways and no
others:

**A file with no rows now has a header.** The header used to be pushed by the
stream, ahead of its first row, so a stream that received no chunks produced a
zero-byte file. The writer emits it when the file is opened.

**Quoting is correct on a newline.** The hand-rolled `quote` escaped an embedded
quote and quoted on a comma or a quote, but not on a newline, so a stop name
containing one produced a broken row. The shared writer quotes on all three.

**An absent value is empty rather than the text `undefined`.**

**Stop names come from NaPTAN read by column name.** They were read by slicing
the national CSV at positions `[0,1,4,10,14,18,19,29,30]` in a separate download
step that rewrote it to `/tmp/Stops.csv`. The values are the same; what changes
is that a column added or moved by the DfT is now a missing field rather than a
street name silently appearing in the latitude.

**Coordinates keep the precision NaPTAN published.** They are carried as the text
the CSV held, so `51.45000` stays `51.45000` rather than becoming `51.45`.

**The zip is written in process.** `yazl` is replaced by the same deterministic
archiver the rail feed uses: flat, entries sorted, and awaited, so the command
resolves when the file exists.
