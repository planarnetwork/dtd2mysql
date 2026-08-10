---
"dtd2mysql": patch
---

Split the tool into a monorepo.

`dtd2mysql` is now assembled from five internal `@gb-rail` packages rather than one
flat tree. Its behaviour is unchanged: the CLI flags, the import path and the GTFS
output are all as they were, and the GTFS output was verified byte-identical against
the same database before and after the move.

The published layout changes. The tarball is now a single bundled file plus the bin
shim, so `files` is `bundle` and `bin` rather than `dist/src` and `dist/config`, and
the `types` field is gone - it pointed at a file that was never emitted. Anything
deep-importing `dtd2mysql/dist/src/...` or `dtd2mysql/dist/config/...` has nothing to
import; that code is in the `@gb-rail` packages, which are internal for now.
