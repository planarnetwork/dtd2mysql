# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A CLI + library that converts [TransXChange](http://naptan.dft.gov.uk/transxchange/index.htm) (UK bus/coach timetable XML) into a [GTFS](https://developers.google.com/transit/gtfs/) zip. Published to npm as `transxchange2gtfs`. Requires `zip`/`unzip` binaries on PATH (so it does not run on Windows).

## Commands

- `npm start -- <input...> <output.zip>` — run the CLI against sources via `tsx`
- `npm test` — run the full vitest suite
- `npx vitest run test/path/to/File.spec.ts` — run a single test file
- `npx vitest test/path/to/File.spec.ts` — watch mode for a single file
- `npm run lint` / `npm run lint:fix` — biome check / check --write
- `npm run coverage` — vitest with v8 coverage report
- `npm run prepublishOnly` — the build step (`tsc` → `dist/`, copies `resource/` into `dist/resource`). Runs automatically before `npm publish`

## Architecture

The whole pipeline is a chain of Node `Transform` streams assembled in `src/Container.ts`. Understanding the pipeline is the fastest way to find where anything belongs.

```
FileStream → XMLStream → TransXChangeStream → TransXChangeJourneyStream
                                      │                 │
                                      │                 ├─► CalendarStream       → calendar.txt
                                      │                 ├─► CalendarDatesStream  → calendar_dates.txt
                                      │                 ├─► TripsStream          → trips.txt
                                      │                 └─► StopTimesStream      → stop_times.txt
                                      ├─► AgencyStream    → agency.txt
                                      ├─► RoutesStream    → routes.txt
                                      ├─► TransfersStream → transfers.txt
                                      └─► StopsStream     → stops.txt
```

- `src/converter/FileStream.ts` — emits individual XML files; handles `.xml` inputs, `.zip` inputs, and nested zips recursively
- `src/xml/XMLStream.ts` — parses XML to JSON (wraps `xml2js.parseString`)
- `src/transxchange/TransXChangeStream.ts` — JSON → typed `TransXChange` object (extracts stops, journey patterns, services, operators, vehicle journeys)
- `src/transxchange/TransXChangeJourneyStream.ts` — expands vehicle journeys into per-service journey objects, applying operating profiles and bank holidays
- `src/gtfs/*Stream.ts` — each one consumes from either the TransXChange stream or the journey stream and emits CSV rows for one GTFS file
- `src/gtfs/GTFSFileStream.ts` — shared base class; subclasses override `header`/`transform`
- `src/converter/Converter.ts` — collects the per-file streams into a `yazl` zip
- `src/reference/NaPTAN.ts` — indexes UK stop reference data (ATCO code → stop details / lat-lon)
- `src/Container.ts` — the wiring. Anything new that needs injecting belongs here

A GTFS stream that needs NaPTAN data (`StopsStream`, `TransfersStream`) receives the indexes via constructor, not globals.

### NaPTAN auto-download

On first run the CLI downloads `/tmp/Stops.csv` from the NaPTAN endpoint (see `src/converter/GetStopData.ts`, invoked from `Container.getConverter`). This means:
- Integration-style tests that build a real `Converter` will hit the network and write to `/tmp` unless `skipStops: true` is passed
- `--skip-stops` (CLI flag) and `--update-stops` (force refresh) control this behaviour
- Current tests in `test/` exercise individual streams directly and do NOT trigger the download

### Bank holidays

Resolved via the `date-holidays` npm package in `src/reference/BankHolidays.ts`, which maps each TransXChange `Holiday` enum to a rule+locale (GB-ENG / GB-SCT) and computes a rolling window of ±decades around the current year. No manual list to extend.

## Testing

- Vitest with `globals: true` and `types: ["vitest/globals"]` in `tsconfig.json` — specs use `describe`/`it`/`expect` without imports
- `test/util.ts` provides `awaitStream()` (collects emitted rows from a Transform) and `splitCSV()` (parses one CSV row into fields) — use them rather than wiring raw stream listeners
- Specs mostly feed a handwritten JSON blob into one stream and assert on the CSV-ish output rows

## Tooling choices worth knowing

- **Biome formatter is intentionally disabled** (`biome.json` → `formatter.enabled: false`). Biome only lints; the existing code style is preserved as-is. Don't enable the formatter in passing — a full reflow is its own PR
- **tsconfig `include: ["src/**/*.ts"]`** — root-level TS files like `vitest.config.ts` are *not* typechecked by `tsc`. Vitest types its own config via esbuild at runtime
- **`package.json` `files` allow-list** governs the npm tarball. `.npmignore` still exists but `files` wins. If you add a new top-level directory that should ship, add it to `files`
- **`autobind-decorator`** is applied to the three stream classes (`Converter`, `TransXChangeStream`, `TransXChangeJourneyStream`). If you add a new `@autobind` class, remember `experimentalDecorators` is already on in tsconfig

## Release pipeline

Publishing is fully automated from `master`:

1. Bump `version` in `package.json` in your PR
2. Merge to master
3. `.github/workflows/release.yml` runs: lint + tests on Node 20 and 22, then the publish job checks whether `<name>@<version>` is already on the npm registry via `npm view`. If new, it `npm publish --provenance`es and pushes a `vX.Y.Z` tag. If the version is unchanged, the publish step no-ops cleanly

The publish job uses Node 24 (for bundled npm ≥ 11.5.1 required by trusted publishing) and npm OIDC — there is no `NPM_TOKEN` secret in the workflow, authentication is via the repo's npm Trusted Publisher configuration.

`.github/workflows/ci.yml` is the PR-only lint+test matrix; `release.yml` runs its own test job on master pushes so the two don't double-run.

## Gotchas

- The output of a conversion is byte-sensitive: dates, times, and stop ordering are assertion surfaces in real integrations. When changing anything in the journey/calendar/time logic, run an end-to-end conversion against a real TXC zip and diff the output against a pre-change run, not just the unit tests
- All times are left in local time (no timezone conversion) — see README "Notes"
- Stops with the same ATCO code across documents are assumed identical
