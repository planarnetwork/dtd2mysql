# @gb-transit/gtfs-output

## 0.2.0

### Minor Changes

- b2d81cf: Republish the workspace libraries, which the CLI can no longer run without.

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

### Patch Changes

- Updated dependencies [1d05d5b]
  - @gb-transit/gtfs@0.2.0

## 0.1.0

### Minor Changes

- 0f61a32: Split the tool into a monorepo.

  `dtd2mysql` is now assembled from five `@gb-transit` packages rather than one flat tree,
  and they are published in their own right: a GTFS build that reads from somewhere other
  than this tool's MySQL schema can depend on `@gb-transit/gtfs` without the CLI.

  **The command line is unchanged.** Same flags, same environment variables, same GTFS
  output - verified byte-identical against the same database before and after the move. If
  you install `dtd2mysql` to run it, nothing about this release asks anything of you.

  **The package layout is not**, which is why this is a major. Anything importing from the
  package rather than running it has to move:

  - `dtd2mysql/dist/src/...` and `dtd2mysql/dist/config/...` no longer exist. That code is
    in the `@gb-transit` package that now owns it - record layouts in `dtd-schema`, the
    parser in `feed-parser`, the GTFS model, transforms and build in `gtfs`, the writers in
    `gtfs-output`, SFTP and feed sequencing in `dtd-source`.
  - `files` is `dist` and `bin`. `main` and `types` resolve to `dist/index.js` and
    `dist/index.d.ts`, which is where they are emitted - `main` previously named a path that
    the `files` list did not ship, so `require("dtd2mysql")` never worked.

### Patch Changes

- Updated dependencies [0f61a32]
  - @gb-transit/gtfs@0.1.0
