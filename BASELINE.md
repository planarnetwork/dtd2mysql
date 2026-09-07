# Baseline changes

The baselines that belong to no single package: [`type-surface.json`](type-surface.json), which
records every name the libraries export, and
[`.github/validator-baseline*.json`](.github), which records what the nightly's real feed is allowed
to raise.

Each entry says what moved and why, so a diff in review can be checked against a reason rather than
taken on trust. CI fails a pull request that moves one without adding an entry here. A baseline
belonging to one package is explained in that package's own `fixtures/BASELINE.md` instead — an
entry here does not excuse a golden feed moving, and an entry there does not excuse this.

## The type surface

**Absorbing gtfsmerge and transxchange2gtfs.** `@gb-transit/gtfs-schema` gains `Columns`,
`FileSchema`, `fileSchema`, `GTFS_COLUMNS`, `GTFSFileName`, `GTFSColumn`, `RowWriter`, and
`Shape`/`ShapeID`/`ShapeRow`; `GTFSOutput` moves into it from `@gb-transit/gtfs`, which re-exports
it. `@gb-transit/gtfs-output` gains `CSVRowWriter`, `field`, `writeZip`, `deliverFeed` and
`workingDirectory`. Three packages are new: `@gb-transit/naptan`, `@gb-transit/txc-source` and
`@gb-transit/gtfs-read`.

**Folding the row reader into the loader.** `@gb-transit/gtfs-read` is removed — it was never
published — and its surface moves into `@gb-transit/gtfs-loader` as `readFeed`, `readFeedRows`,
`FEED_FILES`, `READ_COLUMNS`, `feedFileOf`, `toRow`, `RawFeed` and `RawOptions`, reached through
`loadGTFS(source, {raw: true})`. Nothing else moved: the reader is the same code under a different
name, and `loadGTFS`'s own surface is unchanged.
