# @gb-transit/gtfs-output

## 2.1.1

### Patch Changes

- 531238f: Write each zip entry's size in its own header, so a reader never has to guess.

  The previous release replaced adm-zip with fflate's streaming writer. That fixed the 2GB entry limit
  and introduced a worse fault, which this fixes: fflate cannot put an entry's size in its header,
  because the compressed size is not known until the entry has been compressed and the header is
  written before it. So it sets the flag that says "the sizes are in a descriptor after the data", and
  writes zeros.

  That pushes the cost onto whoever reads it. A reader going forwards cannot know where an entry ends,
  so it scans the compressed bytes for the next header's signature — and compressed bytes are
  effectively random, so eventually they contain one. Merging the rail feed with the national Bus Open
  Data Service feed produced exactly that: `PK\x03\x04` appearing 515MB into 684MB of compressed stop
  times, which truncated the file at 2.25GB of 2.96GB for any reader that does not consult the central
  directory. `unzip` was unaffected, because it reads the central directory first.

  The chance is roughly `3 × compressed bytes / 2^32` per build: about 1 in 68 for today's rail feed,
  about one in two for a feed with the national bus data in it. adm-zip never had it, because it
  buffered each entry and so knew the sizes. Nor is it fflate's alone — yazl writes the same header for
  the same reason, and BODS's own feed is the same gamble when we read it.

  A writer streaming into a pipe has no choice. This one writes to a file, which can be seeked, so it
  does not have to guess: the header goes down with room for the sizes and no descriptor flag, the
  entry is streamed through `node:zlib`, and the twelve bytes are written back where they belong. The
  crc32 comes from `zlib.crc32` over the chunks as they pass, so nothing is read twice and nothing is
  held.

  `@gb-transit/gtfs-output` no longer depends on fflate; it was the last thing in the package that was
  not a node built-in or a workspace package. The archive is 5% smaller and marginally quicker, both
  from native deflate rather than a JavaScript one, and a merged national feed's thirteen files come
  out byte for byte what they were.

  Two limits are now checked rather than one: an entry over 4GB, and an archive over 4GB, since a local
  header's offset is four bytes as well. Both fail the build. zip64 lifts them and is now ours to write
  whenever the feed needs it.

- Updated dependencies [d16b874]
  - @gb-transit/gtfs@3.4.0

## 2.1.0

### Minor Changes

- 5be51bc: Write the feed's zip as a stream, so a feed larger than 2GB can be published.

  `writeZip` used adm-zip, which assembles the whole archive in memory and refuses any entry over
  2GB. A rail feed is nowhere near that. A feed with bus stop times in it is: merging
  `gtfs.zip` with the Bus Open Data Service's national feed produces a `stop_times.txt` of 2.96GB, and
  the merge ended

  ```
  Writing merged.zip
  File size (2955798571) is greater than 2 GiB
  ```

  after three minutes of work, with the feed built and nowhere to put it.

  It now streams each file into the archive through fflate, which the reader and four other packages
  here already use. Writing the 3.05GB feed above takes 81 seconds and 116MB of memory, and the result
  is a valid archive whose contents are byte for byte the directory it came from.

  Two limits remain, and both are now explicit rather than discovered:

  - fflate writes an entry's size into four bytes and does not check that it fits, so a file over 4GB
    would produce an archive that decompresses to the wrong thing with no error at all. The sizes are
    checked before anything is written, and a file too large to describe fails the build with the name
    and the size in the message. zip64, which fflate does not write, is what lifts this.
  - Every entry is now stamped with a fixed date rather than the modification time of the file it came
    from, so two builds of the same feed produce the same bytes. They did not before: the files a feed
    is built from are written afresh by every build.

### Patch Changes

- Updated dependencies [315fec8]
- Updated dependencies [28cac53]
  - @gb-transit/gtfs-schema@2.2.0
  - @gb-transit/gtfs@3.3.0

## 2.0.1

### Patch Changes

- 4941620: Lower the engine floor from Node 26 to Node 22, with Temporal from `temporal-polyfill`.

  Node 26 was required for one reason: it is the first release to expose `Temporal` as a global,
  and the calendar is written against it. That put every package on a runtime that will not be LTS
  until October, for an API the rest of the code does not care about the provenance of.

  `temporal-polyfill` provides it, and hands over to the built-in global wherever there is one, so
  Node 26 runs exactly the implementation it ran before — the import resolves to the same object.
  Where `Temporal` was reached as a global it is now imported, which is the whole of the change to
  the date handling: the polyfill exports it as a namespace, so the declarations still read
  `Temporal.PlainDate`, and the pinned type surface has not moved.

  CI runs 22 and 26 rather than 26 alone. `lib` drops from `esnext` to `es2024` so that an API the
  floor does not have cannot be typed as though it did — which is also what proves the global is
  gone, since a missed call site no longer compiles.

  One thing was genuinely broken below Node 24 rather than merely unavailable. `FeedZip` reports
  the file and the line a CIF record failed to parse on by throwing from a `data` listener, and an
  error thrown there only reaches `finished()` from Node 24 onwards; on 22 it escaped as an uncaught
  exception and the stream never settled. It destroys the stream with that error instead, which
  reports the same thing on every version.

- Updated dependencies [4941620]
  - @gb-transit/gtfs-schema@2.1.0
  - @gb-transit/gtfs@3.1.0

## 2.0.0

### Major Changes

- 610f8ef: Absorb gtfsmerge and transxchange2gtfs, and give every producer one schema

  The GTFS schema was written down four times across three repositories, in
  three incompatible ways, and only one of them type checked. It is now written
  once, in `@gb-transit/gtfs-schema`, and a producer declares which columns of
  which file it writes.

  **`@gb-transit/gtfs-schema`** — `GTFSOutput` moves here from `@gb-transit/gtfs`,
  which re-exports it. New `Columns`, `FileSchema` and `fileSchema`, and a new
  `Shape`/`ShapeRow`. `StopTime.stop_headsign` was typed `null` and is now
  `string | null` — `Headsigns.ts` already put a string there through
  `Object.assign`, so this is a correction. `Trip` gains optional `block_id` and
  `shape_id` and its `service_id` accepts a string; `StopRow` loosens
  `location_type`, `zone_id`, `stop_code`, `stop_desc` and `stop_url`, and its
  coordinates accept text so a value that arrived as `51.50740` does not
  re-serialise a digit short; `Transfer`'s twelve producer extensions and its two
  trip ids become optional; `RouteType` gains `Air`.

  **`@gb-transit/gtfs` and `@gb-transit/gtfs-output`** — `GTFSOutput.open` takes
  the columns and returns a `RowWriter<R>` rather than a `Writable`, and
  `extensionFile` takes columns. `csv-write-stream` is replaced by `CSVRowWriter`, which
  writes the header when the file is opened - so a file with no rows is an empty
  table rather than an empty file. Its escaping is a transcription of
  csv-write-stream's rule rather than a differential result: the committed goldens
  are unchanged, and the cases they do not reach are written down in
  `CSVRowWriter.spec.ts`.
  `writeZip` is exported so all three tools share one deterministic archiver.

  **`@gb-transit/gtfs-loader`** gains `readFeed` and `readFeedRows`: the same feed
  read as the rows it was written as, every file and every column, for a tool that
  rewrites a feed rather than plans over one. Built from the parts `loadGTFS`
  already used.
  **`@gb-transit/naptan`** is new: the NaPTAN download, cache and CSV read, with
  no other dependency, so a bus converter does not inherit a rail transit model to
  get them.

  **`cif2gtfs` and `dtd2mysql`** — the SPI change, and `cif2gtfs`'s `main` points
  at `dist/api.js` so requiring the package no longer runs a build.

  **`transxchange2gtfs`** — behaviour is the same except: a file with no rows now
  has a header rather than being empty; a value containing a newline is quoted;
  an absent value is empty rather than the text `undefined`; NaPTAN is read by
  column name from the current DfT endpoint rather than by slicing the national
  CSV at fixed positions, and `--naptan <file>` reads it from disk; the zip is
  written in process, so `zip` is no longer required on PATH; and
  `bin/transxchange2gtfs.sh` required a path the build never produced, so the
  published CLI could not have run at all.

  **`gtfsmerge`** — behaviour is the same except for five fixes, each written up
  in `apps/gtfsmerge/fixtures/BASELINE.md`. Generated walk transfer distances were
  wrong twice over: the ruler was calibrated at 46°N, central France, and the
  coordinates were passed to it as `[latitude, longitude]` where it takes
  `[longitude, latitude]` — together about 70% too long. `--no-date-filter`
  dropped every calendar in every feed rather than keeping them. Transfers to a
  stop nothing calls at were written, leaving dangling references. A call moved
  from a platform onto its station left the station as `location_type` 1, which
  GTFS forbids for a stop something calls at. `transfers.txt` now carries
  `from_trip_id` and `to_trip_id` and renumbers them, so a coupling survives the
  merge, and `stops.txt` carries `platform_code`. `--ruler-latitude` and
  `--date-filter` are new, `zip` is no longer required on PATH, and `main` points
  at `dist/api.js`.

### Patch Changes

- Updated dependencies [610f8ef]
- Updated dependencies [33612ec]
  - @gb-transit/gtfs-schema@2.0.0
  - @gb-transit/gtfs@3.0.0

## 1.0.1

### Patch Changes

- Updated dependencies [783c178]
- Updated dependencies [0f6bf84]
  - @gb-transit/gtfs@2.0.0

## 1.0.0

### Major Changes

- Realign the published version with the registry.

  `yarn release` published every workspace whether or not its version had moved, so a
  package with nothing to say failed the run on "cannot publish over the previously
  published versions" and took the packages that did have something to say down with it.
  Five releases died that way, from 2 September on: the registry stayed where it was while
  master went on bumping numbers that nobody could install.

  Those numbers are abandoned rather than published. Every `@gb-transit` package is
  released here at 1.0.0 - a major, because the last version installable from npm is
  0.2.0 and this is not what that number promises.

### Patch Changes

- Updated dependencies [b675f63, 2a1ca37]
  - @gb-transit/gtfs@1.0.0

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
