# Restructure plan

Status: Epic A landed, Epic C in progress; everything else proposal.

**Epic A is done.** The tree is a Yarn 4 monorepo of one app and five libraries, built
exactly as the move map in §2 describes. A4 stays deferred and no second storage app was
written, as decided in §2. Nothing from Epics B, C, D, E or F is in yet.

The move was verified rather than asserted. Building the feed from master and from the
restructured tree against the same database on the same day gives byte-identical output in
every file, with the same CLI surface and the same 119 tests. Two consecutive runs of the
same code on the same day are byte-identical, so that comparison distinguishes a real
change from noise.

Two deliberate departures from §2:

- The `GTFSOutput` *interface* lives in `libs/gtfs`, not `libs/gtfs-output`. The build
  orchestrator writes through it and the dependency graph runs `gtfs-output → gtfs`, so
  putting it in `gtfs-output` would invert that edge. `FileOutput` and the zip command are
  in `gtfs-output` as planned.
- **`dtd2mysql` is the only published package.** The `@gb-rail` libraries are private and
  bundled into its tarball with esbuild, so nothing new appears on npm and installing
  `dtd2mysql` pulls nothing from the scope. Making a library public later is one field in
  its manifest and one external in the bundle command.

The root has two tsconfigs. `tsconfig.json` is what tsx, vitest and the editor read, and it
matches every source file in the workspace; `tsconfig.build.json` holds the project
references `tsc -b` walks. One file cannot do both: tsx takes a file's compiler options from
the nearest tsconfig whose `include` matches it, and a solution file matches nothing, so the
libraries would be compiled with the wrong kind of decorator whenever a command was run from
the repository root.
Issues: [#119](https://github.com/planarnetwork/dtd2mysql/issues/119) (external data),
[#115](https://github.com/planarnetwork/dtd2mysql/issues/115) (one-shot GTFS),
[#116](https://github.com/planarnetwork/dtd2mysql/issues/116) (other databases — deferred, see C4),
[#81](https://github.com/planarnetwork/dtd2mysql/issues/81) / [#80](https://github.com/planarnetwork/dtd2mysql/issues/80) (splits and joins),
[#69](https://github.com/planarnetwork/dtd2mysql/issues/69) (stations and platforms)

## Goal

Turn a single-purpose MySQL import tool into a monorepo that can:

1. Build a GTFS feed with no database at all (#115).
2. Accept external data from sources other than the DTD feed (#119).
3. Publish that feed nightly as a GitHub release, linked from a website built in the same repo.

Support for other databases (#116) is **deliberately out of scope for this pass**. There is one
storage app, `apps/dtd2mysql`. The seam that would make a second backend possible is built, because
it is worth having on cohesion grounds alone, but no second implementation is written until the
restructure has landed. See §2 and C4.

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
  dtd2gtfs/
libs/
  feed-parser/
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

Libs publish as `@gb-rail/*`. The two CLI apps publish bare: `dtd2mysql` and `dtd2gtfs`.

A second storage app (`dtd2postgres`, or any other backend) slots in beside `dtd2mysql` without
moving anything, but is not built in this pass.

### Dependency graph

```
libs/feed-parser        →  (none)
libs/dtd-schema         →  feed-parser
libs/dtd-source         →  feed-parser, dtd-schema, gtfs
libs/gtfs               →  (none)
libs/gtfs-output        →  gtfs
libs/enrich-*           →  gtfs

apps/dtd2mysql          →  feed-parser, dtd-schema, dtd-source, gtfs, gtfs-output
apps/dtd2gtfs           →  dtd-source, gtfs, gtfs-output, enrich-*
apps/website            →  (none; consumes build artifacts)
```

Libs never depend on apps.

### Decision: leave the storage layer alone

There is **no `libs/feed-storage`**, and the import path is not restructured in this pass.
`ImportFeedCommand`, `MySQLSchema`, `MySQLTable`, `MySQLStream` and `DatabaseConnection` all stay
where they are, moving into `apps/dtd2mysql` unchanged when the app is assembled.

A database-agnostic patch for this area is coming from someone else. Refactoring the same files
concurrently would produce a conflict that is expensive to resolve and, worse, impossible to review
honestly — a rebase across a moved, split and renamed storage layer gives no way to tell an
intentional behaviour change from one introduced by the merge.

So the sequencing is inverted: **the incoming patch lands first, then anything here builds on
whatever abstraction it introduces.** Designing a `Storage` interface now would either duplicate
that work or actively conflict with it.

This changes what the plan owes that patch rather than removing work. **T6b becomes the priority,
and it is useful to the patch author, not just to us**: import each feed, fingerprint all 80 tables,
assert the fingerprints are unchanged. That is exactly the evidence a database-agnostic rewrite
needs, and the baseline for it already exists. Build it early, independently of the restructure, and
hand it over.

The read side is untouched by all of this. `CIFRepository`'s hand-written MySQL is replaced by
`TimetableSource` in C1, which is a different file and a different concern.

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
source:  { type: cif, path: ./RJTTF918.ZIP }   # or { type: mysql }
today:   2026-08-07                            # omit for the real date
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
- Libs are private and bundled into the app that needs them; apps publish bare.
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
| `src/database/**`, `src/cli/ImportFeedCommand.ts` | `apps/dtd2mysql/src/` — **moved verbatim, not restructured** (see §2) |
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

### What dtd2mysql actually promises

The restructure moves 3,500 lines across twelve packages. dtd2mysql exposes four contracts, and
before this work only one of them had any defence at all:

| Contract | What the restructure does to it | Guarded today |
|---|---|---|
| Database content after import | A8 relocates `ImportFeedCommand` and `src/database/**`; an incoming patch then rewrites them | no |
| CLI flags | `Container` dissolves into per-app composition roots | no |
| Published package layout | `files: ["dist/src", "dist/config"]`, but `config/` becomes `libs/dtd-schema` | no |
| Exported types | `types: ./dist/index.d.ts`; the package is imported as a library | no |
| GTFS output | rebuilt on `TimetableSource` | partly, via T7 |

The starting position was worse than it looks: **no test touched a real database**.
`MySQLTable.spec.ts` uses a `MockDatabaseConnection`, `ci.yml` has no service container, and
`docker-compose.yml` was not wired into anything. Schema generation, inserts, the fares clean SQL
and `LOAD DATA LOCAL INFILE` had no end-to-end coverage.

Note also that `import` is the larger half of the contract. GTFS output is one command; the other
three feeds and every `--download-*`/`--get-*` flag run through the import path.

### The reference data

Feeds are pulled from the DTD SFTP server and kept in `data/`, which is gitignored, along with
`.env.local` holding the credentials. Baselines are generated locally with the scripts in `data/`.

| Feed | Files | Notes |
|---|---|---|
| Timetable | `RJTTF918` + `RJTTC919` + `RJTTC920` | full refresh generated 2026-08-04 |
| Fares | `RJFAF847` + `RJFAC848` + `RJFAC849` | |
| Routeing | `RJRG1057` | |
| NFM64 | `nfm64.zip` | separate HTTP download, not SFTP |

Imported, this is **80 tables**: 424,684 schedules and 6,961,761 stop times; 7,334,718 fares and
696,661 flows; 246,316 permitted routes; 10,148,371 nfm64 rows.

Three tables import zero rows — `easement_exception`, `location_association`,
`non_derivable_fare`. Expected for these feeds; recorded so the baseline does not look suspicious.

**Feeds are not committed.** They are large (118 MB of DTD zips plus a 239 MB nfm64 zip), they are
current operational data rather than superseded snapshots, and they go stale. The committed fixture
is the small derived slice in T4. *This revises decision 1, which was taken when the only feed to
hand was the superseded RJTTF582 — see §6.*

### What the tooling produces

`data/snapshot-db.sh <dir>` fingerprints the database:

- `schema.sql` — DDL via `mariadb-dump --no-data --skip-dump-date`
- `tables.tsv` — per table: row count and a sha256 over a primary-key-ordered dump, so the hash is
  stable regardless of storage order
- `columns.tsv` — column types, nullability and defaults, so a type change is visible even when the
  row hash happens to match

`data/snapshot-gtfs.sh <dir>` builds a feed and records, per file, the row count plus two hashes:
raw and content-sorted, so a change in row *ordering* can be told apart from a change in *content*.

An early result from this: after importing fares, routeing and nfm64, all 16 timetable table hashes
were byte-identical to the timetable-only snapshot, with only `log` differing. The four importers
genuinely do not touch each other's tables — an assumption the incoming storage patch depends on,
now with evidence.

### What is reproducible, and what is not

**The import is reproducible in principle.** It is a pure function of the feed files: no
`CURDATE()`, no clock. That makes the database snapshot usable as a comparison target immediately,
and it is the half that guards the largest contract.

*In principle*, because one thing is unverified: `route_id` and `service_id` derive from
`schedule.id`, a MySQL auto-increment. `MySQLTable` buffers 5,000-row batches and flushes them
through a connection *pool*, so insert ordering is not guaranteed by construction even if it holds
in practice. T2 has to establish this by re-importing into a fresh database and diffing the hashes,
before any of it can be trusted.

`trip_id` is no longer among them. [#121](https://github.com/planarnetwork/dtd2mysql/pull/121)
makes it `TUID_runsFrom_runsTo`, a function of the CIF record rather than of insert order, and
removes the calendar tightening and division that used to move the date range after the fact. That
is a third of T2 delivered by a different route than T2 describes — see the ticket.

**The GTFS build is not reproducible.** It filters on `CURDATE()`, so its output is a function of
the day it runs and cannot be regenerated tomorrow. T1 must land before a GTFS baseline means
anything beyond same-day comparison.

### Layers

**Layer 0 — Determinism.** Inject a clock (T1), pin the identifiers (T2), sort the output (T3).
Nothing above works without these.

**Layer 1 — Unit.** Pure functions in `libs/gtfs`. 104 tests today, 118 on #121.

**Layer 2 — Mini-fixture e2e.** *Every PR.* The workhorse, and what makes Epic A safe.

A slice of a real feed, under 2 MB, with the expected GTFS committed as **plain sorted text, not a
zip**, so a behaviour change appears as a readable diff in review. It must deliberately cover:

- the full STP overlay stack (P/O/N/C) on one TUID
- associations VV / JJ / NP with each date indicator, including the transitive closure of
  associated TUIDs (the connected-component logic F1 also needs — build once, use twice)
- late-night rollover through `formatTime`'s +24h path, and a schedule with **no** stop times, which
  `addLateNightServices` used to crash on
- Z-trains from ZTR, including a location absent from `physical_station` (see B15)
- every `routeTypeIndex` entry: OO, XX, XZ, BR, BS, OL, XC, SS
- activity codes R, T, TB, TF, U, D, N, and a **null** activity
- a single-stop schedule, and one whose calendar empties after overlays
- schedules starting and expiring at the window boundary
- reversed date ranges (#117) and an all-zero day mask (B16)
- a CIE station with zero eastings, and the MSN header record
- a permanent and an overlay over an **identical date range** with different stopping patterns, so
  the trip ID decision in §6.6 stays deliberate
- a schedule cancelled **while its association is also cancelled** — the shape B18 fabricated
  service from
- **two associations for the same pair of TUIDs at different locations**, one cancelled and one
  live over the same dates (B21)
- an all-permanent source with **overlapping records**, which `z_schedule` is and the CIF timetable
  is not (B19)

**Layer 3 — Import equivalence.** *The one that actually protects dtd2mysql.* Import each of the
four feeds with pre-refactor code at a pinned commit, snapshot, repeat with refactored code, assert
identical. This is what defends the storage layer through both the move and the incoming
database-agnostic patch, and a test double cannot do it: a double proves an abstraction is called,
not that the SQL is the same.

**Layer 4 — Full-feed GTFS.** Track A invariants — referential integrity, no `start_date >
end_date`, monotonic times within a trip, no duplicate keys, row counts within tolerance — plus a
normalised diff against the T10 baseline. Requires credentials, so it runs locally and on a
credentialed nightly, not on PRs.

**Layer 5 — Surface tests.** Cheap, and they catch what unit tests structurally cannot:
CLI contract (T11), packaged artifact (T12), type surface (T13).

**Layer 6 — GTFS validator.** MobilityData validator with a committed notice baseline.

### Process controls

These matter as much as the tests:

- **Each extraction is a pure move.** No logic change in the same commit as a file move, so the diff
  is reviewable and `git log --follow` shows a rename.
- **dtd2mysql is assembled last** (A8), so its behaviour stays frozen while libs are extracted
  beneath it.
- **Gate `publish.yml` before starting** (E8). A half-migrated master must not ship.
- **Prerelease before `latest`.** Publish an rc, dogfood it, then move the dist-tag.


## 4. Tickets

### Epic T — Test foundation

Gates everything else. T2 and T3 are required by the nightly build (E2) regardless.

**T1 · Inject a clock; remove `CURDATE()`** — **done**
`BuildContext.today: Temporal.PlainDate` threaded through the three range-filtered queries;
`--today` CLI flag and config key; nightly passes the real date, tests pin `2025-09-02`. Subsumes
B3: all three queries derive their window from one value.

`BuildContext` carries `today` and `range`; `dateRange` turns the two into a `from`/`to` window and
`TimetableSource` takes that window rather than a MySQL interval string, so the SQL is parameterised
rather than interpolated. `--today`/`--range` on the command line beat `GTFS_TODAY`/`GTFS_RANGE`,
which beat the real date and three months. `parseRange` still reads the `3 MONTH` form GTFS_RANGE
has always used and refuses anything it cannot parse, rather than passing it to the driver.

With the defaults the output is byte-identical to before. The B3 half is measurable on the current
feed: at `6 MONTH` the old code pulled 93,348 extra schedules while dropping the **846 associations**
that belong with them. No z-trains fall in that band in this feed, so replacement buses happen not to
be affected today - the mechanism was still wrong.

**T2 · Deterministic identifiers** *(partly delivered by #121)*
`route_id` and `service_id` no longer depend on MySQL auto-increment ordering. `route_id` is
`schedule.id`; `service_id` is a counter incremented in iteration order in `createCalendar`. Assign
both in the build from a canonical sort. Same input plus same `--today` produces the same ids across
engines and across runs. Test: import twice into fresh databases, assert identical output.

`trip_id` is already done, by a different mechanism than this ticket assumed: #121 makes it the
string `TUID_runsFrom_runsTo` rather than an integer from a sort, which needs no global ordering at
all. The STP indicator is deliberately **not** in the key — see §6.6.

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
B7 to B21 each rebaseline under T8 as they land, and the rebaseline diff *is* the evidence the fix
did what it claimed.

**Instruments the discard paths.** Every place the pipeline drops data reports a count: schedules
removed by the `stopTimes.length <= 1` filter, stop times dropped by the `crs_code IS NOT NULL`
join, schedules whose calendar empties after overlays, and stops with no coordinate. Today only one
of these is understood — 59,024 of the 440,671 BS records are STP=C cancellations, which carry zero
stops by construction and are correctly excluded. The remainder are unmeasured, and D4 (CORPUS) and
#80 both claim to reduce them, so a number is needed before and after. The counts feed E5's Quality
page.

**T6b · Import equivalence harness** *(depends T9, T14)* — **highest priority in Epic T**
The Layer 3 test, and the one that actually protects dtd2mysql. Import each of the four feeds,
fingerprint all 80 tables with `snapshot-db.sh`, and assert the hashes match a committed baseline.

Promoted because the storage layer is about to be rewritten by an incoming database-agnostic patch
(§2, A4). This harness is what makes that patch reviewable — it answers "did the rewrite change what
lands in the database?" with a yes or no rather than an opinion. It is not restructure-specific and
does not depend on any of Epic A, so it can be built now and handed to the patch author. The
baseline it needs already exists.

**T7 · Old-vs-new equivalence harness** *(depends T2, T3)* — **partly done**
Runs pre-refactor `dtd2mysql --gtfs` at a pinned commit against the new build; normalised-identical
or fails with a per-file diff.

The pinned-commit half exists and asserts byte-identity, which is stronger than the normalised diff
this ticket asked for and is what Epic A was held to. The normalised half also exists, and is what
comparing two *sources* needs: `route_id` and `service_id` are counters assigned during the build,
so the same timetable arriving in a different order gets different numbers for the same thing.
Resolving every reference to what it points at before comparing removes that. T2 and T3 make the
identifiers and the row order deterministic, at which point the normalising half can go.

Neither is committed. Both want a database and a feed, so they live alongside the gitignored `data/`
rather than in the repository.

**T8 · Rebaseline protocol** *(depends T5)*
`yarn test:e2e --update` regenerates the mini golden, and the `data/snapshot-*.sh` scripts
regenerate the T10 fingerprints. CI fails any commit touching `fixtures/*/golden/**` or a committed
baseline fingerprint without a corresponding entry in `fixtures/BASELINE.md` giving the reason and
issue number.

Since the baseline encodes current behaviour rather than correct behaviour, rebaselining is the
normal path for every ticket in Epic B and beyond — the requirement is that it is deliberate and
explained, not that it is rare.

**T9 · Reference feed acquisition**
Scripted, credentialed download of all four feeds into a gitignored `data/`, with `.env.local` for
credentials (both already in place). `data/README.md` documents which feed each baseline was cut
from and how to reproduce it. Feeds are deliberately **not** committed: they are large, current and
perishable. What is committed is T4's derived slice.

**T10 · Generate the baselines** *(depends T1, T2, T3, T9)*
Run the current implementation against the reference feeds and commit the fingerprints — not the
feeds, not the GTFS payload.

- Database: `data/snapshot-db.sh`, all 80 tables, for all four feeds.
- GTFS: `data/snapshot-gtfs.sh` at a pinned `--today`, which requires T1.

Assert regeneration is byte-identical on a second run. Record the generating commit. The baseline
captures current behaviour *including* known defects; that is the point, and each fix rebaselines
under T8 with the diff as evidence it worked.

**T11 · CLI contract test**
Table-driven over every flag in the README, asserting each resolves to the expected command.
`Container.getCommand` ends in `default: return this.getShowHelpCommand()`, so a dropped `case`
label does not throw — it prints help and exits 0. A user's cron job would silently stop importing.
Assert exhaustively, including that an unknown flag *does* fall through to help.

**T12 · Packaged artifact smoke test**
`npm pack`, install the tarball into a clean directory, run `--help` and one real command against a
throwaway database. Tests execute against source, so `main`/`types`/`files` breakage is invisible to
them — and `files: ["dist/src", "dist/config"]` is exactly what breaks when `config/` moves to
`libs/dtd-schema`.

**T13 · Type surface snapshot**
Generate `.d.ts` and diff against a committed snapshot, so a removed or renamed export is a decision
rather than an accident. The package ships `types`, so library consumers exist.

**T14 · MariaDB service container in CI**
`ci.yml` has no database, so nothing above Layer 1 can run there. Add a MariaDB service, wire up
`docker-compose.yml`, and make Layer 2 and Layer 5 run on every PR. Prerequisite for Epic A.

### Epic B — Correctness

Land on master before the restructure, so the move is a pure refactor with green tests either side.

**B0 · GTFS build hangs on schedules with no stop times** — **done**, `3d8f218`
`getSchedules` keeps schedules with no stop time records via `stop_time.id IS NULL`. Those arrive as
a single row with every stop_time column null, and `createStop` was still called on them, so
`row.activity.match()` threw on the null activity. The throw happened inside the driver's result
listener, where it was swallowed: the query emitted neither "end" nor "error", `loadSchedules` never
settled, and the build hung at four of nine files, 0% CPU, indefinitely. 6,560 schedules in the
current feed trigger it, so `--gtfs` could not produce a feed at all.

Fixed by skipping stop creation when `stop_id` is null (guarding `activity` alone would only move
the throw two lines down), catching throws in the result listener so a bad row fails the build
loudly, and teaching `addLateNightServices` that `stopTimes[0]` may not exist. Added the
`ScheduleBuilder` spec, which did not exist.

**B1 · Emit `feed_info.txt`** *(coordinate with B14)*
Written by the build; `feed_version` from the source DTD filename; start and end dates from the
actual min/max of emitted calendars, not the requested range.

**B2 · Replace `links.txt` with `transfers.txt`**
Fixed links emitted as `transfers.txt` rows (`transfer_type=2` plus `min_transfer_time`), merged
with the existing station interchange rows. Time and day-of-week windows GTFS cannot express are
documented in `stop_desc` or dropped with a logged count. `links.txt` kept behind a flag for one
minor version, then removed. `config/gtfs/import.ts` updated. Blocks E2.

**B3 · Honour `GTFS_RANGE` everywhere** — *merged into T1, and **done** there.*

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

**B14 · Calendar fragments lying entirely in the past** — **superseded by #121**
`applyOverlays` called `ScheduleCalendar.divideAround` to split a base schedule around an overlay.
The query filters on the *original* schedule's `runs_to`, so a resulting fragment could fall wholly
before the build date. `isEmpty` was `runsFrom > runsTo`, which catches reversed ranges (#117) but
not expired ones, so those fragments survived: 32 calendars in the reference output ended before the
generation date, the earliest starting 2021-01-03.

#121 deletes `divideAround` and the date tightening in `clone`, so no fragment is created and no
calendar range moves after the fact. Measured on a 3 month build: **41 → 1**. The mechanism this
ticket describes no longer exists.

What survives is the B1 coupling, which the residual case still trips: `feed_start_date` computed
from `min(calendar.start_date)` reports the earliest calendar rather than the coverage window. B1
must derive its window from calendars that have not expired, and log the count dropped. Retained
rather than closed because the T10 baseline moves when #121 lands and T8 wants the reason recorded.

**B15 · Z-train stop times reference stops that do not exist**
34 rows in `stop_times.txt` point at `QHA` (31) and `ZUX` (3), which appear in `z_stop_time` but not
in `physical_station`. `getStops` only emits rows from `physical_station`, while the z-train query
passes `location AS crs_code` straight through. The comment in `getSchedules` claims ZTR locations
"already use CRS codes so avoid the disaster above" — they do not. Referential integrity failure in
the published feed. Either emit a stop for these locations or drop the stop times, and log the
count. D4 (CORPUS) may resolve the mapping properly.

**B16 · Calendars with no days set** — **superseded by #121**
`service_id 101` in the current build has all seven day flags zero, runs 20260222–20991231, is
attached to a live trip and has no `calendar_dates` entries — a service that can never run.
`ScheduleCalendar.isEmpty` tested only `runsFrom > runsTo`, so an all-zero mask survived the filter
that #117 added.

#121 takes the ticket's first option: `isEmpty` now walks the range looking for a day the service
actually runs, so an all-zero mask and a fully-excluded calendar both report empty. Measured on a
3 month build: **1 → 0**. Note the cost — `isEmpty` is now O(range) rather than O(1), and it is
called per overlay application. It short-circuits on the first running day, so only genuinely empty
calendars pay the full scan, and build wall clock moved from 30s to 36s.

**B17 · Download commands never exit**
`DownloadCommand.run` closes the SFTP connection but never the database pool, so the process hangs
after the transfer completes. Harmless interactively, fatal for a scheduled job — E2 would hang
until the workflow timeout. Ties in with A5's `FeedCursor`, which removes the database from the
download path entirely.

**B18 · Associations fabricate service outside a schedule's validity** — **fixed by #121**
`Association.apply` looped the association's exclude days and cloned the associated schedule onto
each one with `assoc.calendar.clone(excludeDay, excludeDay)`, with no check that the date falls
inside the schedule's own range. `clone` built a calendar on a date the schedule never ran, and the
`isEmpty` guard could not catch it because the range was not reversed. Instrumented on a 3 month
build it fires **154 times across 11 TUIDs**, and `mergeSchedules` then glued the fabricated days
into ranges — `G38655` was emitted as a trip running 20260817–20260828, exactly the window its `C`
record cancels.

Net effect: **22 date/TUID pairs running on dates a cancellation covers**, plus one where no record
covers the date at all. #121 replaces the whole mechanism, applying association exclusions as
exclude days on the associated schedule. This is the largest single behaviour change in the T10
rebaseline and the reason the diff is not empty.

**B19 · STP indicator constants never match the feed**
`STP.Permanent` is `"Previous"` and `STP.New` is `"Next"`, since `94b2834`. The feed carries `P` and
`N`, so neither constant has ever matched. Only `Cancellation = "C"` works. The single place it
mattered — `if (schedule.stp !== STP.Permanent)` in `applyOverlays`, guarding "perms don't overlap"
— has therefore been dead since it was written.

**The guard has to stay dead, and this is the load-bearing part.** `z_schedule` is entirely
permanent records and has **537 overlapping pairs**; the CIF timetable has none. Correcting the
constants without also removing the guard makes permanent records skip overlay application, and the
overlapping z-trains then run twice — 89 duplicated service-days when tried. Fix the constants,
delete the guard, and keep a fixture case for an all-permanent overlapping source.

**B20 · The merge step conflates records differing only in activity codes** — **fixed by #121**
`mergeSchedules` grouped by `Schedule.hash`, which covers stop id, arrival and departure time and
the day mask, but **not** `pickup_type`/`drop_off_type`. Two CIF records with identical timings and
different activities merged into one trip carrying the first record's activity codes. 90 trips in a
3 month build are affected — for example `L80807` at `VIR`, where a `U` (pick up only) record is
published with drop-off permitted.

#121 removes the merge step entirely, so each record keeps its own activities. That is also where
its trip count increase comes from — see E2.

**B21 · Association overlays ignore the association location** — **fixed by #121**
CIF identifies an association by `base_uid` + `assoc_uid` + `assoc_location` + `start_date` +
`stp_indicator`, and `applyOverlays` resolves the last two — so the key it groups by has to be the
other three. `Association.tuid` was `base_assoc` only, one field short, so every association for a
pair shared a bucket and each overlaid the others regardless of location.

A timetable change that moves a divide is written as a cancellation at the old location plus an
overlay at the new one, over identical dates. Both landed in one bucket, the cancellation sorted
last and excluded every day of the overlay, and the join was lost entirely on exactly the dates the
feed was describing it. `G26265`/`G26144` does this four times:

```
HORSHAM  2026-10-19  2026-10-22  VV  O     divide at Horsham for these dates
BRHM     2026-10-19  2026-10-22  NULL C    and cancel Barnham for these dates
```

8 records are over-cancelled feed-wide. Adding the location to the key restores 13 date/TUID pairs
that were emitting the two trains separately, with service days and trip count unchanged.

Not every cancellation pairs with a substitute — `G26265`/`G26144` also cancels at Horsham on dates
with no Horsham association in the window. Either those target records outside it, or the location
on a `C` is sometimes incidental, in which case they should still be cancelling Barnham. Unresolved,
and the fixture case in §3 should pin whichever reading is right.

**B22 · The incrementals' stop times and z-trains never reach the database** — *found while building C2*

`ImportFeedCommand.setLastScheduleId` restores the BS record's id counter from the database before
processing a CFA, and it is the only counter it restores. `stop_time`, `z_schedule` and
`z_stop_time` are all written with ids the parser generates from zero on every run, and `id` is the
primary key, so `INSERT IGNORE` silently drops every row whose id already exists.

On the reference feed:

- **5,354 schedules from RJTTC919 and RJTTC920 have no stop times at all.** Every LO/LI/LT the
  incrementals carry collides with a row the refresh already inserted. Those schedules then drop out
  of the GTFS build through the `stopTimes.length <= 1` filter, and any cancellation or overlay they
  were expressing goes with them - the base schedule keeps running on dates the feed withdrew it.
- **The incrementals' ZTR is discarded in full.** RJTTF918, RJTTC919 and RJTTC920 ship three
  different ZTR files and the database only ever holds the first, so replacement buses are frozen at
  the last full refresh.

This is the entire difference between the two sources. Building the same three zips through
`CifFileSource`, which keys on the CIF unique key rather than on a generated id, produces 6,140 trips
the database build does not have and 85 whose calendars differ because a later ZTR revised them.
Against a database holding only the full refresh the two agree exactly - see C2.

The fix is to restore the counters the way `setLastScheduleId` does for BS, or to stop generating
ids and let the unique keys carry the identity. It moves the T10 baseline, so it rebaselines under
T8. It also overlaps the incoming database-agnostic patch, so it wants coordinating rather than
racing.

B7 to B22 are captured in the T10 baseline as current behaviour, and each rebaselines under T8 when
it lands.

### Epic A — Monorepo migration

**A1 · Bootstrap Yarn 4 workspaces** — **done**
`.yarnrc.yml` with `nodeLinker: node-modules`; `.yarn/releases/` committed; root manifest declares
`apps/*` and `libs/*`; lavamoat `allowScripts` migrated to `dependenciesMeta.*.built`; root
`tsconfig.base.json` with project references; vitest `projects`. `yarn install --immutable` and
`yarn test` green with the tree still in its current shape.

**A2 · Extract `@gb-rail/feed-parser`** *(depends A1)* — **done**
`src/feed/**` and its tests moved. Zero dependencies on `config/` or `src/database`. Publish
dry-run clean.

**A3 · Extract `@gb-rail/dtd-schema`** *(depends A2)* — **done**
All four feed configs moved; imports `@gb-rail/feed-parser` only. Removes the `config/` ↔ `src/`
circularity.

**A4 · Extract `@gb-rail/feed-storage`** — **deferred, not in this pass**
Blocked on an incoming database-agnostic patch to the same files. Restructuring them concurrently
would conflict, and the merge would be unreviewable. See §2.

What this pass owes instead: `src/database/**` and `ImportFeedCommand` move into
`apps/dtd2mysql/src/` **verbatim** in A8 — a path change and nothing else, so the incoming patch
rebases cleanly onto a rename rather than onto a rewrite. T6b is the deliverable that makes that
patch safe to merge, and should be built before it arrives.

**A5 · Extract `@gb-rail/dtd-source`** *(depends A3)* — **done**
SFTP client and download sequencing moved. **The last-processed cursor must no longer come from the
`log` table** — `DownloadCommand.getLastProcessedFile()` queries MySQL, which `dtd2gtfs` will not
have. Introduce a `FeedCursor` interface with a `Storage`-backed implementation for the DB apps and
a file or no-op implementation for one-shot.

**A6 · Extract `@gb-rail/gtfs`** *(depends A1)* — **done**
Entities, model, transforms, build orchestrator. `agency.ts` and `station-coordinates.ts` land in
`src/data/` unchanged. **No `mysql2` dependency.** All existing gtfs tests pass untouched.

**A7 · Extract `@gb-rail/gtfs-output`** *(depends A6)* — **done**
`FileOutput`, `GTFSOutput`, fixed `ZipOutput` (post-B5). Nothing else.

**A8 · Assemble `apps/dtd2mysql`** *(depends A5, A6, A7)* — **done**
`src/database/**` and `ImportFeedCommand` moved verbatim, `MySqlTimetableSource`,
`CleanFaresCommand`, `GTFSImportCommand`, per-app composition root replacing `Container`.
**No logic changes to the import path** — it is a path move, reviewable as a rename. **CLI surface byte-identical** — every flag in the README
behaves as before. Smoke test installs the tarball and runs `--help`. The two `mysql2` pools are
resolved once in the composition root, not via `require()` inside a memoized getter;
`Container.ts`'s dynamic requires do not survive the move.

**A9 · Changesets and release pipeline** *(depends A8)* — **done**
`publish.yml` replaced. `yarn workspaces foreach --topological npm publish` gated on a changeset.
Dry-run on PRs.

Revised: the libraries are **not** published. They are private, and `apps/dtd2mysql` bundles
them into a single file with esbuild, so the published tarball is the CLI and nothing else -
four files, and the only runtime dependencies are the npm packages the libraries themselves
pull in. The cost is that deep imports into `dtd2mysql/dist/...` no longer resolve; the
`types` field goes with them, having pointed at a file that was never emitted.

**A10 · CI for workspaces** *(depends A1)* — **done**
`yarn install --immutable`, `.yarn/cache` cached, tests run per workspace with failures attributed
to a package.

### Epic C — Storage decoupling and one-shot

**C1 · `TimetableSource` interface** *(depends A6, A8)* — **done**
Interface in `libs/gtfs`. `MySqlTimetableSource` in `apps/dtd2mysql` produces byte-identical output
to today's `CIFRepository`. The ordering contract documented and asserted.

The contract is: rows for one schedule contiguous and in stop sequence, schedules `stp_indicator`
DESC so a cancellation or overlay follows the record it replaces. `ScheduleBuilder` groups on `id`
changing, so a source that interleaves two schedules emits two trains carrying each other's stops -
there is a test that pins exactly that, because it is the failure a second source will hit first.

`ScheduleBuilder.load` takes any iterable in that order, which is what a source that is not a
database query needs. Its per-run state moved into a cursor at the same time: the MySQL source loads
passenger schedules and z-trains into one builder concurrently, and a shared cursor would have
spliced the two streams together.

**C2 · `CifFileSource` — one-shot** *(depends C1, A5)* — **done, closes #115**
Read MCA/MSN/ALF/ZTR from the zip via `feed-parser`. A CIF file is already grouped by schedule, so
the only work is a stable sort on the STP indicator. Comparison runs at a pinned `--today`;
differences explained or zero. Peak RSS recorded, feeding E2 and F1.

It took more than a stable sort. The SQL is the specification, and reproducing it meant reproducing
the parts of MySQL the queries lean on: a CHAR column loses its trailing spaces where a VARCHAR does
not, which matters because stop activities are VARCHAR and are read two characters at a time;
`GROUP BY crs_code` returns the first row inserted for the code; `UNION` deduplicates the fixed
links, which is the only reason importing the same ALF three times does not triple `links.txt`.
`MemoryTable` holds each feed table with the insert semantics the importer gives it - INSERT IGNORE,
REPLACE, DELETE - so a refresh followed by its incrementals produces what importing them in that
order would.

**Against a database holding only RJTTF918, every output file is byte-identical.** Against the
three-zip database the two disagree, and the disagreement is B22: the importer drops the
incrementals' stop times and their ZTR entirely, so the database build is missing 6,140 trips the
file build has and 85 more have stale calendars. The new source found the bug in the old one.

Cost on the reference feed, three month window, one refresh: **44 s wall and 4.6 GB peak RSS from
the files, against 38 s and 3.8 GB from the database**. Six seconds and 800 MB is what parsing 650 MB
of CIF costs over querying it back out of MySQL, and it buys not needing MySQL. Three zips take 46 s
and 4.9 GB. The memory is the whole feed's Schedule objects, the same set the database build holds,
so F1's sharding helps both equally. Only the finished Schedules are kept - each BS record's stop
rows become a Schedule as soon as its stops end and are then dropped, because holding 2.9 million of
them as well roughly doubles it.

**C3 · `apps/dtd2gtfs`** *(depends C2, A7)* — **done, not published**
`dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip --range "6 months"`. No database dependency in
the tree.

It is private for now, along with the libraries: `dtd2mysql` is the only thing on npm. Publishing it
is a decision to take once there is a nightly feed to point people at (E2 and E4), not a side effect
of the code existing.

`--source` repeats, so a refresh and its incrementals are applied in order. `--out` writes a zip or
a directory depending on the extension, and `--today` and `--range` come from T1's build context.

**C5 · Rail Data Marketplace credential path** *(depends A5)*
The NRDP (`opendata.nationalrail.co.uk`) was retired in early 2026; tokens now come from Rail Data
Marketplace (`raildata.org.uk`). The SFTP host still serves files but credential issuance has moved.
`dtd-source` transport becomes pluggable (SFTP today, RDM API when needed); credentials resolved
from env in one place; README updated.

**C4 · `apps/dtd2postgres`** — **deferred, not in this pass** — **would close #116**
Postgres `Storage` (DDL generation, `COPY`-based bulk load) and `PostgresTimetableSource`, plus a
`CleanFaresCommand` equivalent, verified against a MySQL import row-for-row via T6b.

Held back deliberately. Adding a second backend during the restructure would mean validating the
`Storage` abstraction against a backend that does not exist yet, while simultaneously moving 3,500
lines — two sources of uncertainty at once, with no way to tell which caused a failure. T6b
establishes that the MySQL import is unchanged first; only then is there a trustworthy baseline to
hold a second implementation against. The incoming database-agnostic patch (§2) may supersede this
ticket entirely.

Nothing in the structure has to move when it is picked up: `dtd2postgres` slots in beside
`dtd2mysql`, implements the same two interfaces, and depends on the same libs.

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

**E8 · Fix the npm release pipeline** — *do this first*
Publishing has been broken since 2025-12-02: npm has 6.6.3 while git carries tags through v6.6.9.
`npm publish` fails with `404 Not Found - PUT .../dtd2mysql`, which is npm's response to an
*unauthorised* publish rather than a missing package. The `NPM_TOKEN` secret needs regenerating.

Two defects beyond the expired token:

- `npm version patch` and `git push --follow-tags` run **before** `npm publish`, so every failed run
  still burns a version number and pushes a tag. Six phantom versions exist as tags but were never
  published. Reorder, or roll back the bump on failure.
- The workflow triggers on every push to `master` with no path filter, so a documentation-only
  commit attempts a release. Add a path filter, and gate the workflow while Epic A is in flight — a
  half-migrated master must not ship.

Until this is fixed, no fix reaches users, including B0.

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

*The 5% gate and #121 collide.* Removing the merge step is a **+19% step change** in trip count
(229,898 → 273,539 on a 3 month build; stop times +21%, 16 MB → 20 MB zipped) because consecutive
CIF records with the same stopping pattern are no longer collapsed into one trip. Whichever lands
second trips the other. Either #121 ships before the gate exists, or the gate needs a documented
one-off reset. The size is worth revisiting separately: merging by calendar *after* ids are assigned
would recover most of it without destabilising them.

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
E8, T14  →  B1,B2,B4,B5,B7..B21  →  T1,T2,T3  →  T4,T5,T9,T11..T13  →  T10  →  T6,T6b,T7
                                   ↓
                                  A1  →  A2,A6  →  A3,A5,A7  →  A8
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

**79 tickets** listed (B22 was found while building C2). B3 is absorbed into T1, B0 is done, B14, B16, B18, B20 and B21 are
resolved by #121, and A4 and C4 are deferred out of this pass, leaving 69 in scope.

---

## 6. Decisions

1. **Test assets** — *revised.* Reference feeds are pulled live from the DTD SFTP server into a
   gitignored `data/` and are **not** committed: they are large (118 MB of DTD zips plus a 239 MB
   nfm64 zip), current rather than superseded, and perishable. Only the derived slice (T4) and the
   generated fingerprints (T10) are committed.

   This supersedes the earlier decision to commit `RJTTF582.ZIP`, which was taken when that
   superseded feed was the only one to hand. A current feed is also a strictly better fixture: it
   contains the pathological cases — RJTTF582 evidently did not trigger B0, since the 2025 build
   succeeded, whereas the current feed has 6,560 schedules that do.
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
5. **The storage layer is not touched** — no `libs/feed-storage`, and A4 is deferred. A
   database-agnostic patch to those files is coming from someone else, and concurrent refactoring
   would conflict irreconcilably. `src/database/**` and `ImportFeedCommand` move into
   `apps/dtd2mysql` verbatim so the patch rebases onto a rename. #116 and `dtd2postgres` (C4) are
   deferred with it. T6b is promoted, because it is what makes the incoming patch reviewable — see
   §2.
6. **`trip_id` is `TUID_runsFrom_runsTo`, without the STP indicator** (#121). Including the
   indicator would make the key the full CIF identity and guarantee uniqueness, but it also means a
   withdrawn overlay reads as one trip vanishing and another appearing. Leaving it out means the
   permanent that resurfaces keeps the id, so a client sees an amended timetable — which is the more
   useful signal, and the one a consumer can act on. The cost is accepted: where an overlay covers
   only *part* of a permanent schedule there is no way in GTFS to say "this trip replaces that one",
   so the excluded dates are simply absent. NeTEx can express it; GTFS cannot.

   Uniqueness is not at risk in practice. `schedule` and `z_schedule` both carry
   `UNIQUE KEY (train_uid, runs_from, stp_indicator)`, and no `train_uid` appears in both, so two
   base schedules can only share an id when a permanent and an overlay share a date range — and the
   overlay supersedes the permanent, so one of them drops out. The only path that can still collide
   is two associations for the same pair of TUIDs live over the same dates, and a pair divides once,
   so the feed always cancels one: there are no uncancelled multi-location overlaps. `mergeSchedules`
   suffixes rather than throwing anyway, so bad data cannot fail a build.

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
