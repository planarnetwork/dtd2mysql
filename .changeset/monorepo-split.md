---
"dtd2mysql": patch
"@gb-transit/feed-parser": minor
"@gb-transit/dtd-schema": minor
"@gb-transit/dtd-source": minor
"@gb-transit/gtfs": minor
"@gb-transit/gtfs-output": minor
---

Split the tool into a monorepo.

`dtd2mysql` is now assembled from five `@gb-transit` packages rather than one flat tree.
Its behaviour is unchanged: the CLI flags, the import path and the GTFS output are all as
they were, and the GTFS output was verified byte-identical against the same database
before and after the move.

The five libraries are published in their own right, so a GTFS build that reads from
somewhere other than this tool's MySQL schema can depend on `@gb-transit/gtfs` without
the CLI.

The published layout of `dtd2mysql` changes. Its `files` is `dist` and `bin` rather than
`dist/src` and `dist/config`, so anything deep-importing `dtd2mysql/dist/src/...` or
`dtd2mysql/dist/config/...` should import the `@gb-transit` package that now holds that
code. `types` points at `dist/index.d.ts`, which is where it is now emitted.
