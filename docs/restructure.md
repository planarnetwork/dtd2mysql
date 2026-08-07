# Restructure plan

Status: proposal
Issues: [#119](https://github.com/planarnetwork/dtd2mysql/issues/119) (external data),
[#115](https://github.com/planarnetwork/dtd2mysql/issues/115) (one-shot GTFS),
[#116](https://github.com/planarnetwork/dtd2mysql/issues/116) (other databases),
[#81](https://github.com/planarnetwork/dtd2mysql/issues/81) / [#80](https://github.com/planarnetwork/dtd2mysql/issues/80) (splits and joins),
[#69](https://github.com/planarnetwork/dtd2mysql/issues/69) (stations and platforms)

## Goal

Turn a single-purpose MySQL import tool into a monorepo that can:

1. Build a GTFS feed with no database at all (#115).
2. Import into MySQL or Postgres behind one abstraction (#116).
3. Accept external data from sources other than the DTD feed (#119).
4. Publish that feed nightly as a GitHub release, linked from a website built in the same repo.

---

## 1. Where we are

### What must survive

- **`src/feed/`** — the `Record`/`Field`/`FeedFile` abstraction. Declarative fixed-width and CSV
  parsing driven entirely by `config/*/file/*.ts`. Format-agnostic, tested, no coupling to rail.
- **`src/gtfs/native/` and `src/gtfs/command/`** — `ScheduleCalendar`, `Association`,
  `applyOverlays`, `applyAssociations`, `mergeSchedules`, `createCalendar`, `addLateNightServices`.
  Pure functions over pure domain objects, no DB, no IO, and the only part with real test coverage.

### What blocks the goal

1. **MySQL sits in the middle of the pipeline, not at the edge.** `CIFRepository` is raw SQL against
   import-shaped tables and is the only route from data to domain model. This single fact blocks
   #115, #116 and any CI build (you would need a MariaDB service container just to emit a file).

2. **`config/` and `src/` import each other.** `config/gtfs/agency.ts` imports
   `src/gtfs/file/Agency`; `src/gtfs/repository/ScheduleBuilder.ts` imports `config/gtfs/agency`.
   No package boundary exists, so there is nowhere to insert one.

3. **The output is not valid GTFS.**
   - `links.txt` is a bespoke file. The ALF fixed links never reach `transfers.txt`, so a stock
     consumer silently loses every walking and tube interchange — 8,702 rows in the reference feed.
   - `feed_info.txt` is absent. No `feed_version`, no coverage window, no publisher. Disqualifying
     for anything published on a schedule.

4. **Hardcoded facts that should be data.**
   - `Schedule.toTrip()` emits `wheelchair_accessible: 1` for every trip in GB. That is a false
     claim, not a placeholder — GTFS has `0` for "no information".
   - `trip_headsign` is set to the **train UID**, an internal identifier like `C12345`, in a
     passenger-facing field.
   - `location_type` and `parent_station` are always NULL, so there is no station/platform
     hierarchy (#69).
   - `config/gtfs/station-coordinates.ts` is a 15,568-line hardcoded literal overriding station
     names, coordinates and `wheelchair_boarding`. This is already external data, with no
     provenance, no licence statement and no update path, shipped inside the npm tarball.
     `config/gtfs/agency.ts` is the same problem for the TOC list.

5. **Two bugs in `CIFRepository.getSchedules`.**
   - `GTFS_RANGE` is interpolated into the passenger query, but `CIFRepository.ts:114` (z-trains)
     and `:135` (associations) hardcode `INTERVAL 3 MONTH`. `GTFS_RANGE=6 MONTH` yields six months
     of trains with three months of replacement buses and associations — silently wrong past
     month three.
   - `const [[lastSchedule]] = ...` then `${lastSchedule.id}` throws `TypeError` on an empty
     `schedule` table rather than giving a useful error.

6. **`OutputGTFSZipCommand` races.** It calls `setTimeout(..., 1000)` then `spawnSync('zip')`, and
   `run()` resolves before the timeout fires. This will fail unattended.

7. **Two `mysql2` pools resolved by `require()` inside a memoized getter** in `Container.ts`.

8. **Memory-bound, not CPU-bound.** The whole `Schedule[]` set is materialised before overlays run.
   See §6 F1 for the parallelisation seam that follows from this.

---

## 2. Target structure

```
apps/
  website/
  dtd2mysql/
  dtd2postgres/
  dtd2gtfs/
libs/
  feed-parser/
  feed-storage/
  dtd-schema/
  dtd-source/
  gtfs/
  gtfs-output/
  enrich-naptan/
  enrich-knowledgebase/
  enrich-osm/
  enrich-corpus/
  enrich-darwin/
```

Libs publish as `@gb-rail/*`. The three CLI apps publish bare: `dtd2mysql`, `dtd2postgres`,
`dtd2gtfs`.

### Dependency graph

```
libs/feed-parser        →  (none)
libs/dtd-schema         →  feed-parser
libs/feed-storage       →  feed-parser
libs/dtd-source         →  feed-parser, dtd-schema, gtfs
libs/gtfs               →  (none)
libs/gtfs-output        →  gtfs
libs/enrich-*           →  gtfs

apps/dtd2mysql          →  feed-parser, dtd-schema, feed-storage, dtd-source, gtfs, gtfs-output
apps/dtd2postgres       →  (same)
apps/dtd2gtfs           →  dtd-source, gtfs, gtfs-output, enrich-*
apps/website            →  (none; consumes build artifacts)
```

Libs never depend on apps.

### Decision: `feed-storage` abstracts import, not query

The read-side SQL in `CIFRepository` is hand-written MySQL — `IF()`, `POSITION()`, `CONCAT()`,
`INTERVAL ${range}`. Making that portable means a query builder or dialect layer, which is a lot of
machinery for two backends. The import side is genuinely uniform.

- `libs/feed-storage` exports `Storage` — `createSchema(record)`, `dropSchema(record)`,
  `bulkLoad(table): Writable`, `recordProcessedFile(name)` — plus the storage-agnostic `ImportFeed`
  orchestration lifted from `ImportFeedCommand`.
- `apps/dtd2mysql` and `apps/dtd2postgres` each own their `Storage` implementation **and** their own
  `TimetableSource` SQL.

Each backend owns its queries; nobody builds an ORM.

### Decision: `libs/gtfs` owns the domain and the interfaces

`gtfs` holds the entity types, the pure transit model, the transforms, the build orchestrator, and
the two SPIs (`TimetableSource`, `Enricher`). `gtfs-output` holds `FileOutput`, a fixed `ZipOutput`,
and nothing else. The only well-tested code in the project ends up in one package with zero IO
dependencies.

`libs/dtd-source` therefore depends on `gtfs`: it does download and zip handling **and** provides
`CifFileSource`, a `TimetableSource` reading the feed files directly. That is what makes
`dtd2gtfs` databaseless.

### The two SPIs

```ts
interface TimetableSource {
  stations(): AsyncIterable<StationRecord>;
  schedules(range: DateRange): AsyncIterable<ScheduleRecord>;   // ordered: stp DESC, id, stop_seq
  associations(range: DateRange): AsyncIterable<AssociationRecord>;
  fixedLinks(): AsyncIterable<FixedLinkRecord>;
}

interface Enricher {
  readonly id: string;                    // "naptan", "osm-platforms"
  readonly attribution: Attribution;      // name, url, licence, licence_url
  readonly priority: number;              // conflict resolution, not last-writer-wins
  load(ctx: BuildContext): Promise<void>;
  apply(feed: MutableFeed, ctx: BuildContext): Promise<EnrichmentReport>;
}
```

Driven by config:

```yaml
source:  { type: cif, path: ./RJTTF582.ZIP }   # or { type: mysql }
today:   2025-09-02                            # omit for the real date
range:   6 months
licence: ogl                                   # or "full" to admit ODbL sources
extensions: [pathways, shapes, fares_v2, translations]
enrich:
  - naptan:        { path: ./naptan.xml, apply: [rail_replacement_stops, stop_code] }
  - corpus:        { apply: [tiploc_crs_mapping, station_hierarchy] }
  - knowledgebase: { token: env:RDM_TOKEN, apply: [wheelchair_boarding, stop_url] }
  - darwin:        { apply: [trip_headsign_via] }
  - osm-platforms: { pbf: ./osm-rail.pbf, apply: [pathways, platform_coords] }
```

Three properties matter more than the interface shape:

- **Provenance, not overwriting.** Every write records `(entity, field, value, enricher_id,
  priority)`. Higher priority wins and the loser is retained in `provenance.json`. Without this we
  get a second `station-coordinates.ts`.
- **`EnrichmentReport` is a first-class output.** Matched, unmatched and conflict counts, published
  on the website. It is the best quality signal available to downstream users and it catches silent
  breakage in the nightly.
- **Licence composition is a build constraint.** OSM is ODbL (share-alike); NaPTAN, CORPUS and
  Network Rail GIS are OGL; Knowledgebase has NRE terms; DTD has RSP terms. The `licence:` key
  selects a tier and a build that mixes a share-alike source into the OGL tier fails.

### Tooling

Yarn 4 (Berry) with `nodeLinker: node-modules` — tsx, vitest and `ssh2` are all happier with it and
PnP buys nothing here.

- Workspace deps via `"@gb-rail/gtfs": "workspace:^"`.
- Libs get `"publishConfig": { "access": "public" }`; apps publish bare.
- The existing `allowScripts` block is `@lavamoat/allow-scripts` config. Under Yarn 4 it becomes
  `dependenciesMeta.<pkg>.built` in the root manifest with `enableScripts: false` in `.yarnrc.yml`.
- TypeScript project references with `composite: true`, so
  `yarn workspaces foreach -A --topological run build` is incremental.
- Vitest `projects` at root so `yarn test` covers every workspace.
- Changesets for versioning. The current `npm version patch` on every master push cannot work
  across twelve packages.

### Move map

| From | To |
|---|---|
| `src/feed/**` | `libs/feed-parser/src/` |
| `config/{fares,timetable,routeing,nfm64}/**` | `libs/dtd-schema/src/` |
| `src/database/DatabaseConnection.ts` | `libs/feed-storage/src/Storage.ts` (interface only) |
| `src/cli/ImportFeedCommand.ts` | `libs/feed-storage/src/ImportFeed.ts` (storage-agnostic) |
| `src/database/MySQL{Schema,Table,Stream}.ts` | `apps/dtd2mysql/src/storage/` |
| `src/sftp/PromiseSFTP.ts`, `src/cli/Download*.ts` | `libs/dtd-source/src/` |
| `src/gtfs/file/**` | `libs/gtfs/src/entity/` |
| `src/gtfs/native/**` | `libs/gtfs/src/model/` |
| `src/gtfs/command/**` | `libs/gtfs/src/transform/` |
| `src/gtfs/repository/ScheduleBuilder.ts` | `libs/gtfs/src/build/` |
| `src/cli/OutputGTFSCommand.ts` | `libs/gtfs/src/build/BuildFeed.ts` |
| `src/gtfs/repository/CIFRepository.ts` | **split** — interface to `libs/gtfs/src/source/`, SQL to `apps/dtd2mysql/src/source/` |
| `src/gtfs/output/**`, `src/cli/OutputGTFSZipCommand.ts` | `libs/gtfs-output/src/` |
| `src/cli/CleanFaresCommand.ts`, `GTFSImportCommand.ts`, `config/gtfs/{schema,import}.ts` | `apps/dtd2mysql/src/` (MySQL-specific: `LOAD DATA LOCAL INFILE`) |
| `config/gtfs/agency.ts`, `station-coordinates.ts` | `libs/gtfs/src/data/` — interim home, deleted by D7 |
| `src/cli/Container.ts` | dissolved into per-app composition roots |
| `test/**` | moves with its package |

---

## 3. Test strategy

### The reference feed

`RJTTF582.ZIP` — DTD timetable feed, sequence 582, generated **2025-09-02**. This is the input, and
it is the only asset the test strategy depends on.

### Why the shipped `gtfs.zip` is not usable as a golden file

A GTFS output built from that feed also exists. It is a genuine pair — its calendars peak at
`end_date` 202512 (5,025 of 7,146), `calendar_dates` span 20250722–20251212, which is exactly the
shape of `runs_from < CURDATE() + INTERVAL 3 MONTH AND runs_to >= CURDATE()` evaluated on
2025-09-02 — but it cannot serve as a comparison target, for two independent reasons.

**It was built by code that no longer exists.** At 2025-09-02 the repository was at `f9f52fb`,
v6.6.1 of June 2024. Everything since postdates it:

| | |
|---|---|
| `4f7a1c8` | Load TSI file (#107) — a feed file that was not previously parsed |
| `5a33785`, `e3a6af0`, `8fd910a` | modernise, dependency updates, import fixes |
| `b921971` | **Replace Moment with Temporal** — every date path rewritten |
| `91d7ee5` | **#117 reversed date ranges** — calendar output behaviour |

A diff against that file mixes intended fixes, the Temporal migration and genuine regressions with
no way to attribute any of them. It is not merely non-reproducible, it is uninterpretable.

**And T7 already does the job correctly.** Old-versus-new equivalence runs the previous
implementation at a *pinned commit*, so every difference maps to a known change. That is what the
shipped file was meant to provide, done in a way that yields signal.

The file is therefore not committed. Its row counts are retained below purely as a coarse smoke
check — if a build from this feed produces 190,000 trips rather than something near 240,000,
something is wrong — and explicitly not as a target.

Historical reference (v6.6.1, built ≈2025-09-02):

| Input (RJTTF582) | | Output (golden) | |
|---|---:|---|---:|
| BS (schedules) | 440,671 | trips | 240,009 |
| LO / LT | 381,647 | stop_times | 2,366,906 |
| LI | 6,258,576 | routes | 6,437 |
| CR | 86,742 | calendar | 7,146 |
| AA (associations) | 4,693 | calendar_dates | 48,499 |
| MSN A-records | 3,265 | stops | 3,079 |
| MCA uncompressed | 651 MB | transfers / links | 3,078 / 8,702 |
| agency | | | 34 |

### Blocker: the pipeline is not reproducible

That file cannot be regenerated today, on any machine, for three reasons:

1. **`CURDATE()`** drives all three GTFS queries. Output is a function of the wall clock.
2. **IDs come from MySQL auto-increment.** `trip_id`, `route_id` and `service_id` all derive from
   `schedule.id`. `MySQLTable` buffers 5,000-row batches and flushes through a *connection pool*, so
   ordering is not guaranteed by construction even if it happens to hold.
3. **No `ORDER BY` on the output queries.** `getStops()` is a bare `GROUP BY crs_code`; row order is
   whatever the engine returns.

Determinism is not test infrastructure here, it is a product requirement. The nightly build must
distinguish "the timetable changed" from "MySQL returned rows in a different order", or every build
looks like a diff. That work belongs at the front of the plan.

### The golden file contains real bugs

Two defects confirmed against the source records. A byte-for-byte golden test would enshrine both
and block the tickets meant to fix them.

**The MSN header leaks in as a stop.** Line 6 of the MSN is:

```
A                             FILE-SPEC=05 1.00 02/09/25 18.08.00   584
```

It starts with `A`, so `MultiRecordFile` parses it as a `physical_station`. The existing
`IntField(35, 1, true, ["S"])` "hack for header" only nulls the interchange status; it does not
reject the record. Result, in `stops.txt` line 2:

```
2/0,PEC=05,                         F,,,,,,Europe/London,0,-14.507,-4.165
```

`stop_id` `2/0` comes from `02/09/25`; `stop_code` `PEC=05` from `SPEC=05`.

**44 MSN records carry `easting=00000, northing=00000`.** `IntField` parses `"00000"` as `0`, not
null, so `(0 - 10000) * 100` projects them to 4.17°S 14.51°W, in the South Atlantic.

61 stops in the reference output sit outside the GB bounding box. They are five distinct
populations, and only one of them is a single decision:

| | Count | What they are | Disposition |
|---|---:|---|---|
| CIE stations | 43 | Irish Rail — Cork, Galway, Tralee. Real places, absent from MSN | `overrides.yaml` with real coordinates (B10) |
| `SOS` Stromness | 1 | Orkney ferry port, same cause | `overrides.yaml` (B10) |
| TOC placeholders | 12 | **Fictional.** `CH ORIGIN`/`CH DESTINATION` and equivalents for EMR, Northern, SWR, TransPennine and CrossCountry | Drop from `stops.txt` with their stop times (B12) |
| `QBN`, `QBS` | 2 | Blackpool North/South bus-tram. Real interchange points, junk coordinates | `overrides.yaml` (B10) |
| `HVH` Hoek van Holland | 1 | Genuinely non-GB but correctly placed at 4.126 E, 51.998 N | No action |
| `2/0` | 1 | The MSN header record | B9 |

The placeholders are **not** identifiable by their `Q` prefix. `Q` is simply a letter, and most `Q*`
codes are real stations — Queens Park London (`QPW`, 4,593 stop times), Queens Road Peckham,
Queenstown Road Battersea, Queenborough, Quakers Yard, Quintrell Downs.

Nor are they identifiable by their `CATZ` TIPLOC prefix. There are 114 `CATZ*` records in the MSN
and most are real rail-replacement stops: `MAERDY BUS` (199 stop times), `DEREHAM KONECTBUS`,
`DEREHAM (COACH)`, `GLASGOW SUBWAY`, `PATCHWAY TITAN RD BUS STOP`. Dropping by TIPLOC prefix would
delete legitimate stops.

The only reliable discriminator is the `<TOC> ORIGIN` / `<TOC> DESTINATION` name pattern, in
combination with a `CATZ` TIPLOC and an invalid coordinate.

**A sixth defect, in the override file itself.** `config/gtfs/station-coordinates.ts:13613` has
TCR's latitude and longitude transposed:

```ts
"TCR": { "stop_name": "Tottenham Court Road (Elizabeth line)",
         "stop_lat": -0.1306, "stop_lon": 51.5163, ... }
```

placing Tottenham Court Road in the Indian Ocean. Exactly one station in 15,568 lines is affected,
which is the argument for D7: a hand-maintained literal with no validation. Ticket B11.

The baseline therefore records **what the code does today, not what is correct**. That distinction
is built into the harness (T6, T8).

### Layers

**Layer 0 — Determinism.** Inject a clock, pin the IDs, sort the output. Nothing above works without
these three.

**Layer 1 — Unit.** Pure functions in `libs/gtfs`. Exists today; keep.

**Layer 2 — Mini-fixture e2e.** *Runs on every PR.* The workhorse, and what makes Epic A safe.

Carve a slice out of RJTTF582 — roughly 40 stations and 800 schedules, under 2 MB — and commit the
expected GTFS as **plain sorted text files, not a zip**. A behaviour change then appears as a
readable diff in code review, which is what is needed while moving 3,500 lines across twelve
packages.

The slice must deliberately cover:

- the full STP overlay stack (P/O/N/C) on one TUID
- associations VV / JJ / NP with each date indicator, **including the transitive closure** of
  associated TUIDs (the same connected-component logic F1 needs — build once, use twice)
- late-night rollover through `formatTime`'s +24h path
- Z-trains from ZTR
- every `routeTypeIndex` entry: OO, XX, XZ, BR, BS, OL, XC, SS
- activity codes R, T, TB, TF, U, D, N
- a single-stop schedule (dropped by `stopTimes.length <= 1`)
- a schedule whose calendar empties after overlays (the `filter(!isEmpty)` path)
- schedules starting and expiring at the window boundary
- reversed date ranges (the [#117](https://github.com/planarnetwork/dtd2mysql/pull/117) regression)
- **a CIE station with zero eastings, and the MSN header record**, so the two known defects are
  pinned and then flipped when fixed

**Layer 3 — Full-feed e2e.** *Nightly, plus a `full-e2e` PR label.* RJTTF582 at
`--today=2025-09-02` against **a baseline we generate ourselves** (T10), not the shipped output.
Because the baseline is produced by our own pinned code after T1–T3, it is reproducible by
construction and every difference is attributable. Two tracks:

- *Track A — invariants* that hold regardless of bug fixes: referential integrity (every
  `stop_times.stop_id` in stops, every `trips.service_id` in calendar ∪ calendar_dates, every
  `route_id` in routes); no `start_date > end_date`; arrival ≤ departure and monotonic within a
  trip; no duplicate keys; row counts within ±2% of the table above.
- *Track B — normalised diff against the T10 baseline.* Canonicalise (sort rows by declared key,
  columns to spec order, lat/lon to 6dp, empty ≡ missing) and diff. Any difference is a regression
  unless the ticket causing it rebaselines under T8, so this is a true regression test rather than
  a comparison against a moving target. **The rebaseline log is the feed's changelog**, and it is
  what E5 renders.

**Layer 4 — Old-vs-new equivalence.** Temporary scaffolding for Epics A and C: run pre-refactor
`dtd2mysql --gtfs` at a pinned commit and the new build on the same input at the same pinned date;
assert normalised-identical. Deleted in C2.

**Layer 5 — GTFS validator.** MobilityData validator with a committed notice baseline. It will flag
the `2/0` stop and the Atlantic coordinates, giving independent confirmation when the fixes land.

### Asset hosting

The mini fixture and `RJTTF582.ZIP` live in the repo under `fixtures/`. The generated baseline
(T10) lives alongside them.

`RJTTF582.ZIP` is 68 MB — clear of GitHub's 100 MB per-file hard limit, though it trips the 50 MB
advisory warning on push. Plain git rather than LFS: it is a fixed historical snapshot that will
never be modified, so it costs one object and avoids making every contributor install `git-lfs` or
consume LFS bandwidth quota.

The feed is superseded and no longer operationally valid, so it is retained purely as a regression
fixture. `fixtures/README.md` records its provenance and that fact.

---

## 4. Tickets

### Epic T — Test foundation

Gates everything else. T2 and T3 are required by the nightly build (E2) regardless.

**T1 · Inject a clock; remove `CURDATE()`**
`BuildContext.today: Temporal.PlainDate` threaded through the three range-filtered queries;
`--today` CLI flag and config key; nightly passes the real date, tests pin `2025-09-02`. Subsumes
B3: all three queries derive their window from one value.

**T2 · Deterministic identifiers**
`trip_id`/`route_id`/`service_id` no longer depend on MySQL auto-increment ordering. Derive schedule
identity from a stable key (`train_uid` + `stp_indicator` + `runs_from` + occurrence) and assign
integer ids in the build from a canonical sort. Same input plus same `--today` produces the same ids
across engines and across runs. Test: import twice into fresh databases, assert identical output.

**T3 · Canonical output ordering** *(depends T2)*
Every output file sorted by a declared key before writing — `stops` by `stop_id`, `trips` by
`trip_id`, `stop_times` by `(trip_id, stop_sequence)`, and so on. Ordering documented per file. No
reliance on engine row order.

**T4 · Fixture slice tool** *(depends T1)*
`yarn fixture:slice --tuids <file> --out fixtures/mini` extracts BS/BX/LO/LI/LT/CR for the given
TUIDs plus the transitive association closure, the referenced MSN A-records **including the header
line**, and matching ALF/FLF/ZTR/TSI rows into a valid `RJTTF001.ZIP`. Output under 2 MB. Reuses the
connected-component code F1 needs.

**T5 · Mini fixture, committed golden, PR job** *(depends T2, T3, T4)*
Fixture and golden text files committed; `yarn test:e2e` builds and diffs; wired into `ci.yml`.
Every case in the Layer 2 list has a named test asserting the specific behaviour, not just the diff.

**T6 · Full-feed harness** *(depends T5, T9, T10)*
Track A invariants plus Track B normalised diff against the T10 baseline. Runs nightly and on the
`full-e2e` label. Runtime and peak RSS recorded per run, feeding E2's sizing and F1's targets.

No defect allowlist is needed: the baseline captures current behaviour including the known bugs, so
B7 to B14 each rebaseline under T8 as they land, and the rebaseline diff *is* the evidence the fix
did what it claimed.

**Instruments the discard paths.** Every place the pipeline drops data reports a count: schedules
removed by the `stopTimes.length <= 1` filter, stop times dropped by the `crs_code IS NOT NULL`
join, schedules whose calendar empties after overlays, and stops with no coordinate. Today only one
of these is understood — 59,024 of the 440,671 BS records are STP=C cancellations, which carry zero
stops by construction and are correctly excluded. The remainder are unmeasured, and D4 (CORPUS) and
#80 both claim to reduce them, so a number is needed before and after. The counts feed E5's Quality
page.

**T7 · Old-vs-new equivalence harness** *(depends T2, T3)*
Runs pre-refactor `dtd2mysql --gtfs` at a pinned commit against the new build; normalised-identical
or fails with a per-file diff. Marked for deletion in C2.

**T8 · Rebaseline protocol** *(depends T5)*
`yarn test:e2e --update` regenerates both the mini golden and the T10 full-feed baseline. CI fails
any commit touching `fixtures/*/golden/**` or `fixtures/full/baseline/**` without a corresponding
entry in `fixtures/BASELINE.md` giving the reason and issue number.

Since the baseline encodes current behaviour rather than correct behaviour, rebaselining is the
normal path for every ticket in Epic B and beyond — the requirement is that it is deliberate and
explained, not that it is rare.

**T9 · Commit the reference feed**
`RJTTF582.ZIP` committed to `fixtures/full/` in plain git (not LFS). `.npmignore` and the workspace
`files` lists updated so it never reaches a published tarball. Checked into a single dedicated
commit so the object is easy to identify. `fixtures/README.md` records provenance, the 2025-09-02
generation date, and that the feed is superseded and retained for regression testing only.

The GTFS output shipped alongside it is **not** committed — see §3 for why it cannot serve as a
comparison target.

**T10 · Generate the full-feed baseline** *(depends T1, T2, T3, T9)*
Run the current implementation against `RJTTF582.ZIP` at `--today=2025-09-02` and commit the
canonicalised output to `fixtures/full/baseline/` as plain text. Reproducible by construction, so
regenerating it on any machine yields byte-identical files — assert that in CI.

This captures current behaviour *including* the known defects; that is the point. B7 to B14 then
each rebaseline under T8, and the resulting diff is the proof the fix worked. Record the generating
commit SHA in `fixtures/README.md`.

### Epic B — Correctness

Land on master before the restructure, so the move is a pure refactor with green tests either side.

**B1 · Emit `feed_info.txt`** *(coordinate with B14)*
Written by the build; `feed_version` from the source DTD filename; start and end dates from the
actual min/max of emitted calendars, not the requested range.

**B2 · Replace `links.txt` with `transfers.txt`**
Fixed links emitted as `transfers.txt` rows (`transfer_type=2` plus `min_transfer_time`), merged
with the existing station interchange rows. Time and day-of-week windows GTFS cannot express are
documented in `stop_desc` or dropped with a logged count. `links.txt` kept behind a flag for one
minor version, then removed. `config/gtfs/import.ts` updated. Blocks E2.

**B3 · Honour `GTFS_RANGE` everywhere** — *merged into T1.*

**B4 · Handle an empty `schedule` table**
Clear error naming the missing import step instead of `TypeError`.

**B5 · Remove the zip race**
Zip written after awaited stream completion, in-process (`adm-zip`/`yazl`) rather than shelling out.
No `setTimeout`. `run()` resolves only when the zip exists.

**B6 · GTFS validator in CI** *(depends B1, B2)*
The mini fixture builds a feed in CI and runs the MobilityData `gtfs-validator` jar. Fails on any
error, prints warnings. Baseline of accepted notices committed.

**B7 · Stop asserting wheelchair accessibility**
`wheelchair_accessible: 0` until D5 supplies real data. `bikes_allowed: 0` documented in code as
"no information", not "no bikes", so it is not mistaken for a fact later.

**B8 · `trip_headsign` should be the destination**
Currently the TUID. Destination station name is available from existing stop data with no external
source. TUID stays available via `trip_short_name`/`trip_id`. D9 later extends this to
"Destination via X".

**B9 · MSN header parsed as a station**
Header and footer comment records rejected by `MultiRecordFile` before field parsing. Test asserts
the header line yields zero records. The `["S"]` hack removed.

**B10 · Zero eastings project to the South Atlantic**
`00000` treated as absent, not zero — `IntField` gains an explicit sentinel list so an all-zero
fixed-width numeric field parses to null. `stop_lat`/`stop_lon` are required in GTFS, so the 46
affected stops are real places that need real coordinates: 43 CIE stations, `SOS` Stromness, and
`QBN`/`QBS` Blackpool bus-tram. Seed `overrides.yaml` — the same file D7 introduces. A stop that
still has no coordinate after overrides fails the build rather than emitting a placeholder. Test
covers a CIE station.

NaPTAN is GB-only and will not cover the 43 CIE stations; a compatible source for Irish stations is
to be identified at implementation time.

**B11 · TCR latitude and longitude are transposed**
`config/gtfs/station-coordinates.ts:13613` has `stop_lat: -0.1306, stop_lon: 51.5163`, placing
Tottenham Court Road in the Indian Ocean. Fix the entry, and add a validation test over the whole
override file asserting every entry falls within the GB bounding box (or an explicit allowlist for
genuinely non-GB stops such as `HVH` Hoek van Holland). The same assertion carries over to
`overrides.yaml` in D7.

**B12 · Drop fictional TOC origin/destination placeholders**
Twelve MSN records are TOC placeholders, not places — `CH ORIGIN`/`CH DESTINATION` and the
equivalents for EMR, Northern, SWR, TransPennine and CrossCountry. They currently appear as stops
in the North Sea and 22 trips call at them.

Matched by the `<TOC> ORIGIN` / `<TOC> DESTINATION` name pattern in combination with a `CATZ` TIPLOC
and an invalid coordinate — **not** by `Q` CRS prefix or `CATZ` TIPLOC prefix alone, either of which
would delete real stations (see §3). Excluded from `stops.txt`, stop times dropped, count logged.

All 22 affected trips have exactly two stops and both are placeholders, so each trip drops to zero
stops and is removed in full by the existing `stopTimes.length <= 1` filter. No trip is left
partially truncated. All 22 originate in ZTR, which is consistent with their being replacement-bus
placeholders. The fixture in T4 must include one so this stays true.

**B13 · Platform number is in the wrong field**
`ScheduleBuilder.createStop` sets `stop_headsign` to the platform. `stop_headsign` overrides the
trip headsign at a stop — it means "this service terminates here", not "platform 3". Platform moves
to `stops.platform_code` on the platform-level stop (F3), or is dropped from `stop_times` if F3 has
not landed. Coordinate with B8, which gives `trip_headsign` a real value for the first time.

**B14 · Calendar fragments lying entirely in the past**
`applyOverlays` calls `ScheduleCalendar.divideAround` to split a base schedule around an overlay.
The query filters on the *original* schedule's `runs_to`, so a resulting fragment can fall wholly
before the build date. `isEmpty` is `runsFrom > runsTo`, which catches reversed ranges (#117) but
not expired ones, so those fragments survive: 32 calendars in the reference output end before the
generation date, the earliest starting 2021-01-03.

Harmless to a consumer in isolation, but it interacts with B1 — `feed_start_date` computed from
`min(calendar.start_date)` would report 2021 for a feed covering autumn 2025, which is actively
misleading. Drop calendars ending before the build date, log the count, and make B1 derive its
window from what remains.

B7 to B14 are captured in the T10 baseline as current behaviour, and each rebaselines under T8 when
it lands.

### Epic A — Monorepo migration

**A1 · Bootstrap Yarn 4 workspaces**
`.yarnrc.yml` with `nodeLinker: node-modules`; `.yarn/releases/` committed; root manifest declares
`apps/*` and `libs/*`; lavamoat `allowScripts` migrated to `dependenciesMeta.*.built`; root
`tsconfig.base.json` with project references; vitest `projects`. `yarn install --immutable` and
`yarn test` green with the tree still in its current shape.

**A2 · Extract `@gb-rail/feed-parser`** *(depends A1)*
`src/feed/**` and its tests moved. Zero dependencies on `config/` or `src/database`. Publish
dry-run clean.

**A3 · Extract `@gb-rail/dtd-schema`** *(depends A2)*
All four feed configs moved; imports `@gb-rail/feed-parser` only. Removes the `config/` ↔ `src/`
circularity.

**A4 · Extract `@gb-rail/feed-storage`** *(depends A2)*
Exports `Storage` and a storage-agnostic `ImportFeed`. No `mysql2` import anywhere in the package.
The incremental-vs-full-refresh logic and the `CFA`/`lastScheduleId` special-casing preserved and
covered by a test double.

**A5 · Extract `@gb-rail/dtd-source`** *(depends A3)*
SFTP client and download sequencing moved. **The last-processed cursor must no longer come from the
`log` table** — `DownloadCommand.getLastProcessedFile()` queries MySQL, which `dtd2gtfs` will not
have. Introduce a `FeedCursor` interface with a `Storage`-backed implementation for the DB apps and
a file or no-op implementation for one-shot.

**A6 · Extract `@gb-rail/gtfs`** *(depends A1)*
Entities, model, transforms, build orchestrator. `agency.ts` and `station-coordinates.ts` land in
`src/data/` unchanged. **No `mysql2` dependency.** All existing gtfs tests pass untouched.

**A7 · Extract `@gb-rail/gtfs-output`** *(depends A6)*
`FileOutput`, `GTFSOutput`, fixed `ZipOutput` (post-B5). Nothing else.

**A8 · Assemble `apps/dtd2mysql`** *(depends A4, A5, A6, A7)*
MySQL `Storage`, `MySqlTimetableSource`, `CleanFaresCommand`, `GTFSImportCommand`, per-app
composition root replacing `Container`. **CLI surface byte-identical** — every flag in the README
behaves as before. Smoke test installs the tarball and runs `--help`. The two `mysql2` pools are
resolved once in the composition root, not via `require()` inside a memoized getter;
`Container.ts`'s dynamic requires do not survive the move.

**A9 · Changesets and release pipeline** *(depends A8)*
`publish.yml` replaced. `yarn workspaces foreach --topological npm publish` gated on a changeset.
Libs public under `@gb-rail`, apps bare. Dry-run on PRs.

**A10 · CI for workspaces** *(depends A1)*
`yarn install --immutable`, `.yarn/cache` cached, tests run per workspace with failures attributed
to a package.

### Epic C — Storage decoupling and one-shot

**C1 · `TimetableSource` interface** *(depends A6, A8)*
Interface in `libs/gtfs`. `MySqlTimetableSource` in `apps/dtd2mysql` produces byte-identical output
to today's `CIFRepository`. The ordering contract documented and asserted.

**C2 · `CifFileSource` — one-shot** *(depends C1, A5)* — **closes #115**
Read MCA/MSN/ALF/ZTR from the zip via `feed-parser`. A CIF file is already grouped by schedule, so
the only work is a stable sort on the STP indicator. Comparison runs through T7's harness at
`--today=2025-09-02`; differences explained or zero. **T7 is deleted in this ticket.** Peak RSS
recorded, feeding E2 and F1.

**C3 · `apps/dtd2gtfs`** *(depends C2, A7)*
`dtd2gtfs build --source RJTTF582.ZIP --out gtfs.zip --range "6 months"`. No database dependency in
the tree. Published bare.

**C4 · `apps/dtd2postgres`** *(depends A4, C1)* — **closes #116**
Postgres `Storage` (DDL generation, `COPY`-based bulk load) and `PostgresTimetableSource`.
`CleanFaresCommand` equivalent. Import of all four feeds verified against a MySQL import
row-for-row.

**C5 · Rail Data Marketplace credential path** *(depends A5)*
The NRDP (`opendata.nationalrail.co.uk`) was retired in early 2026; tokens now come from Rail Data
Marketplace (`raildata.org.uk`). The SFTP host still serves files but credential issuance has moved.
`dtd-source` transport becomes pluggable (SFTP today, RDM API when needed); credentials resolved
from env in one place; README updated.

### Epic D — Enrichment (#119)

**D1 · `Enricher` SPI, `MutableFeed`, provenance** *(depends A6)*
`MutableFeed` gives indexed access to stops, trips and routes post-core-build. Every write records
`(entity, field, value, enricher_id, priority)`; higher priority wins and the loser is retained in
`provenance.json`. `EnrichmentReport` carries matched, unmatched and conflict counts, reusing T6's
report format so the mini fixture can assert enricher behaviour without network access. **Not
last-writer-wins.**

**D2 · Build config format and CLI wiring** *(depends D1, C3)*
`gtfs.config.yaml` selecting source, today, range, licence tier, enrichers (with per-enricher
options and `apply:` field allowlists) and extensions. `dtd2gtfs build --config`. Schema-validated;
unknown enricher ids fail fast.

**D3 · `@gb-rail/enrich-naptan`** *(depends D1)*
OGL. Accurate lat/lon for `RLY` stops (2,673 rail stations); **rail replacement bus stop points**
from `BCT` for BR/BS services; NPTG locality for disambiguation; match report by CRS with the
unmatched list surfaced. **The `(easting - 10000) * 100` OSGB fudge in `getStops()` is removed, not
merely overridden** — NaPTAN becomes the primary coordinate source and the projection path is
deleted along with `proj4` if nothing else needs it.

NaPTAN also carries `RSE` (4,543 station entrances) and `RPL` (rail platforms, ATCO form
`9100ZZTYKKH1`). Extracting those is F3's dependency, and it means the station hierarchy is
buildable entirely from OGL sources.

**D4 · `@gb-rail/enrich-corpus`** *(depends D1)*
OGL, nightly refresh. TIPLOC ↔ STANOX ↔ NLC ↔ CRS mapping replaces the
`LEFT JOIN physical_station ON location = ps.tiploc_code` that currently drops stops. Count of
recovered stop times reported. Blocks F3.

**D5 · `@gb-rail/enrich-knowledgebase`** *(depends D1, C5)*
`wheelchair_boarding` from step-free access data, replacing B7's `0`. `stop_url`, `stop_desc`. Token
via RDM. Responses cached to disk so the nightly is not at the mercy of the API.

**D6 · `@gb-rail/enrich-osm`** *(depends D1, F3)*
**ODbL — share-alike.** Gated behind D8, so it only contributes to `gtfs-full.zip`.

Scope is narrower than originally planned: NaPTAN already supplies stations, platforms and
entrances under OGL (D3), so OSM contributes only the **pathway edges** between those nodes, plus
lift, stair and `wheelchair=*` attributes and `levels.txt`. Consumes a pre-built rail extract (E3),
never the full GB pbf at build time. Because the nodes are OGL, `gtfs-slim.zip` can still carry the
station hierarchy — only the pathway graph is tier-restricted.

**D7 · Retire `station-coordinates.ts` and `agency.ts`** *(depends D3, D5)*
Every station previously covered by the override is covered by an enricher or explicitly listed in a
small documented `overrides.yaml` with a reason per entry. Agency list derives from live TOC
reference data. Diff report of coordinate deltas over 100 m for review before merge.

**D8 · Licence-tiered builds and `attributions.txt`** *(depends D1)*
`attributions.txt` generated from enricher `attribution` fields. The `licence:` tier produces
**`gtfs-slim.zip`** (OGL-compatible sources only) and **`gtfs-full.zip`** (includes ODbL). A build
that mixes a share-alike source into the slim tier fails.

There is deliberately no plain `gtfs.zip`, so no stable `releases/latest/download/gtfs.zip` link
exists. E5 must state which tier a consumer wants; `gtfs-slim.zip` is the documented default
recommendation, with `gtfs-full.zip` for consumers who can accept ODbL share-alike. Blocks E2.

**D9 · `@gb-rail/enrich-darwin` — via locations** *(depends D1, B8)*
New package; Push Port / Darwin Timetable XML, distinct from the Knowledgebase API in D5.
`trip_headsign` becomes "Brighton via Gatwick Airport" where Darwin supplies via text. Matching on
TUID/RSID with an unmatched-rate report. Falls back to B8's plain destination on no match.

**D10 · Bike restrictions** *(depends D1)*
Per-service or per-TOC bike policy mapped to `bikes_allowed` 1/2. Services with no source data stay
at `0`. Coverage report by operator, since this will be patchy and the website should say so.

### Epic E — Publishing

**E1 · Create the `gb-rail-gtfs` data repo**
A year of daily releases would bury the npm tags, and DTD credentials should not sit in a repo that
takes PRs. Secrets configured; feed workflows restricted to the default branch; no
`pull_request_target` anywhere.

**E2 · Nightly build workflow** *(depends C3, B6, D8, E1)*
`cron: '0 5 * * *'` plus `workflow_dispatch`. Downloads the latest full refresh and all subsequent
incrementals with per-filename caching — deterministic, no stateful cursor to corrupt. Builds, runs
the validator, runs T6's Track A invariants against the day's build, and fails the release on
violation or on a swing over 5% in trip count versus the previous build. A published feed that fails
referential integrity must never reach a release.

*Risk:* `ubuntu-latest` is 4 vCPU / 16 GB and every `Schedule` is currently materialised in memory.
Ship at a three-month horizon initially; raise after F1.

**E3 · Weekly OSM rail extract** *(depends E1)*
Separate weekly job pulls Geofabrik `great-britain-latest.osm.pbf`, filters to railway features, and
publishes a small extract as a release asset. The nightly consumes that, never the 1.5 GB source.

**E4 · Release and prune** *(depends E2)*
Release tagged `feed-YYYY-MM-DD` carrying `gtfs-slim.zip`, `gtfs-full.zip`, `provenance.json`,
`enrichment-report.json`, `validation.json`, `feed-meta.json`. Prune keeps the last 30 dailies plus
the first of each month.

Key output: `https://github.com/planarnetwork/gb-rail-gtfs/releases/latest/download/gtfs-slim.zip`
resolves to the newest asset permanently. The site links it once and never rewrites it.

**E5 · `apps/website`** *(depends E4)*
Static (Astro or 11ty). Pages:
- **Download** — the stable links for both tiers, with `gtfs-slim.zip` presented as the default and
  the ODbL implications of `gtfs-full.zip` stated plainly. Coverage window and build time read from
  `feed_info.txt` at build time; no client-side API calls, no rate limits.
- **Quality** — renders `validation.json`, `enrichment-report.json` and the Track B manifest, with a
  30-build trend.
- **Sources and licences** — generated from enricher `attribution` fields, so it cannot drift from
  what actually ran.
- **Docs** — from package READMEs.

**E6 · Pages deploy** *(depends E5)*
Nightly writes `apps/website/data/latest.json` and triggers `actions/deploy-pages`. Site rebuild is
idempotent and independent of the feed build's success.

**E7 · ORR station usage on the website** *(depends E5)*
Not a GTFS field — it is how QA effort gets prioritised. Enrichment reports on the Quality page
sortable by annual entries and exits, so "unmatched in NaPTAN" surfaces Clapham Junction before a
request stop with forty passengers a year.

### Epic F — Scale and differentiation

**F1 · Shard by association-connected TUID component** *(depends C1)*
The build is memory-bound, not CPU-bound. This is the answer to the threading question in #115
without leaving TypeScript. Compute the association graph first (one query, small), find connected
components of TUIDs, assign components to N worker threads; overlays, associations and merges run
per shard. Output identical to single-threaded. Peak RSS and wall clock recorded at 3, 6 and 12
months. Unblocks raising E2's horizon.

**F2 · `shapes.txt`** *(depends D4)*
Geometry from Network Rail GIS track centrelines (OGL). `shape_dist_traveled` populated. Behind an
`extensions:` flag, since it materially inflates feed size.

**F3 · Station and platform hierarchy** *(depends D3, D4, B13)* — **closes #69**

The current feed has `stop_id` and `stop_code` the wrong way round. GTFS defines `stop_code` as
rider-facing text — which CRS is, since it appears on tickets and departure boards — while
`stop_id` is a dataset-internal key. Today CRS is the `stop_id` and TIPLOC the `stop_code`.

NaPTAN supplies the whole node set under OGL, so this does not depend on OSM: `RLY` (2,673 rail
stations), `RSE` (4,543 **station entrances**) and `RPL` (**rail platforms**, ATCO form
`9100ZZTYKKH1` — TIPLOC plus platform number). OSM is then needed only for pathway *edges* and
lift/stair attributes in D6, which materially reduces the ODbL exposure there.

Proposed `stops.txt`:

| field | now | proposed |
|---|---|---|
| `stop_id` | CRS (`PAD`) | NaPTAN ATCO where available, else CRS-derived; platforms as `<station_id>:<platform>` |
| `stop_code` | TIPLOC (`PADTON`) | **CRS** (`PAD`) |
| `platform_code` | — | platform number (new field) |
| `location_type` | always NULL | `1` station, `0` platform, `2` entrance |
| `parent_station` | always NULL | populated for platforms and entrances |
| `stop_desc` | `cate_interchange_status` | free text; interchange status is already carried by `transfers.txt` |

Knock-on changes: `stop_times.stop_id` references the platform stop where known, falling back to
the station; `transfers.txt` `from_stop_id`/`to_stop_id` reference parent stations.

This is a breaking change for every existing consumer joining on three-letter codes. Ship behind a
flag with CRS-only stops as the default for at least one release, and announce the flip on the
website before changing the default.

**F4 · Splits and joins as transfers** *(depends C1)* — **closes #81**
`transfers.txt` rows with `transfer_type=4/5` and `from_trip_id`/`to_trip_id` for VV/JJ
associations. #80 (joins at route start should not be processed) addressed in the same pass.

**F5 · GTFS-Fares v2** *(depends D1)*
The fares and routeing feeds are already imported and discarded at GTFS time. Nobody publishes a GB
rail GTFS with Fares v2 — this is what makes the feed distinctive rather than the sixth ATOC-to-GTFS
converter. `fare_products`, `fare_leg_rules`, `rider_categories` (railcards), `networks`/`areas`
scoped from the routeing guide, `timeframes` from restrictions. Validated with
`gtfs-fares-v2-validator`. Separate artifact so the core feed stays small.

**F6 · `translations.txt`** *(depends D1)*
Welsh and Gaelic station names from TfW and ScotRail reference data.

**F7 · BPLAN / TPS network model** *(depends F2)*
Network links and timing points give `shape_dist_traveled` real distances rather than interpolation.
Platform lengths feed F3's platform stops.

**F8 · BODS cross-check**
Build-time report comparing rail replacement (BR/BS) services against TransXChange in BODS. Report
only, no feed changes — a data-quality signal for the site.

---

## 5. Sequencing

```
B1,B2,B4,B5,B7..B14  →  T1,T2,T3  →  T4,T5,T9  →  T10  →  T6,T7
                                   ↓
                                  A1  →  A2,A6  →  A3,A4,A5,A7  →  A8
                                                                    ↓
                                                        C1  →  C2  →  C3
                                                                       ↓
                                                        D1  →  D3,D8  →  E1  →  E2  →  E4  →  E5,E6
```

Epic B lands on master first: each item is small, and B3's range bug is live. Epic T gates the
migration but T2 and T3 are needed by the nightly regardless, so the work is not additional — only
earlier.

Everything in D and F is independently shippable once D1 exists, so enrichers can be picked up in
parallel by different people without touching the core.

**63 tickets** (B3 is absorbed into T1).

---

## 6. Decisions

1. **Test assets** — `RJTTF582.ZIP` is committed to `fixtures/full/` in plain git as the input
   fixture (T9). The GTFS output shipped with it is **not** committed: it was built by v6.6.1 code
   that predates the Temporal migration and the #117 calendar fix, so differences against it are
   uninterpretable. The full-feed baseline is generated by our own pinned code instead (T10).
2. **Coordinate-less stops** — resolved into six populations rather than one decision: the 43 CIE
   stations, Stromness and the two Blackpool bus-tram points get real coordinates in
   `overrides.yaml` (B10); the twelve TOC origin/destination placeholders are dropped with their
   stop times (B12); `HVH` needs no action; `2/0` is B9. A source for the Irish coordinates is to be
   identified when B10 is picked up.
3. **Field layout** — CRS moves to `stop_code`, `stop_id` becomes the NaPTAN ATCO where available,
   `platform_code` is introduced, and `location_type`/`parent_station` are populated. Full before
   and after table in F3. Ships behind a flag with CRS-only stops as the default for at least one
   release.
4. **Tiers** — `gtfs-slim.zip` (OGL-compatible) and `gtfs-full.zip` (adds ODbL). No plain
   `gtfs.zip`; slim is the documented default (D8, E4, E5).

---

## 7. Sources

- [Rail Data Marketplace](https://raildata.org.uk/) ·
  [RDM — Open Rail Data Wiki](https://wiki.openraildata.com/index.php/Rail_Data_Marketplace) ·
  [RDM Feeds](https://wiki.openraildata.com/index.php/Rail_Data_Marketplace/Feeds)
- [National Rail Data Portal — Open Rail Data Wiki](https://wiki.openraildata.com/index.php/National_Rail_Data_Portal) ·
  [data.atoc.org closedown](https://groups.google.com/g/openraildata-talk/c/p2UaNA1EX2M)
- [Reference Data (CORPUS/BPLAN/SMART)](https://wiki.openraildata.com/index.php/Reference_Data)
- [Knowledgebase Data Feeds](https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/) ·
  [Darwin Data Feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/)
- [openraildata/network-rail-gis](https://github.com/openraildata/network-rail-gis) ·
  [Track, reference line and organisational boundaries — DfT](https://findtransportdata.dft.gov.uk/dataset/track,-reference-line-and-organisational-boundaries-182fe21f794)
- [GTFS Reference](https://gtfs.org/documentation/schedule/reference/) ·
  [Pathways](https://old.gtfs.org/schedule/examples/pathways/) ·
  [Fares v2](https://old.gtfs.org/schedule/examples/fares-v2/) ·
  [gtfs-fares-v2-validator](https://github.com/TransitApp/gtfs-fares-v2-validator)
- [ATOCCIF2GTFS](https://github.com/thomasforth/ATOCCIF2GTFS) ·
  [UK2GTFS](https://itsleeds.github.io/UK2GTFS/) ·
  [DTD4 data recipient user guide](https://dtd4-prod-public-bucket.s3-eu-west-1.amazonaws.com/user-guide/dtd4-data-recipient-user-guide.pdf)
