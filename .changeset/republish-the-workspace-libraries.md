---
"@gb-transit/feed-parser": minor
"@gb-transit/dtd-schema": minor
"@gb-transit/gtfs-output": minor
---

Republish the workspace libraries, which the CLI can no longer run without.

Every `@gb-transit` package is published at 0.1.0 and every one of them has
changed since, but the changesets to date bump only `dtd2mysql`. `dtd2mysql`
depends on them with `workspace:^`, which packs as `^0.1.0`, so releasing the
CLI on its own would resolve the libraries from the registry at the version that
predates the restructure - and 0.1.0 does not export `interchange`,
`withStopPoints`, `toStopRow`, `mergeTransfers` or `createFeedInfo`, all of
which the CLI now imports. The installed CLI would not start.

The `package` CI job installs from tarballs built in the same run, so it proves
the packaging metadata and cannot see this. Nothing has been released yet, so
the fix is to publish the libraries alongside the CLI rather than to repair
anything.
