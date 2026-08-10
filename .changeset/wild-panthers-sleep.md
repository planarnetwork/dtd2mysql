---
"@gb-rail/feed-parser": minor
"@gb-rail/dtd-schema": minor
"@gb-rail/dtd-source": minor
"@gb-rail/gtfs": minor
"@gb-rail/gtfs-output": minor
"dtd2mysql": patch
---

Split the tool into a monorepo.

`dtd2mysql` is now assembled from five `@gb-rail` packages rather than one flat
tree, and those packages are published in their own right. Its own behaviour is
unchanged: the CLI flags, the import path and the GTFS output are all as they
were, and the GTFS output was verified byte-identical against the same database
before and after the move.

What does change for anyone importing `dtd2mysql` as a library is the published
layout. `files` is now `dist` plus `bin` rather than `dist/src` and `dist/config`,
because `config/` has become `@gb-rail/dtd-schema` and the GTFS code has become
`@gb-rail/gtfs`. Deep imports into `dist/src/...` or `dist/config/...` need to
move to the corresponding package.
