# Restructure plan

Status: Epic A and Epic C landed, T1 to T5 done; everything else proposal.

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

**T2 · Deterministic identifiers** *(partly delivered by #121)* — **done**
`route_id` and `service_id` no longer depend on MySQL auto-increment ordering. Assign both in the
build from a canonical sort. Same input plus same `--today` produces the same ids across engines and
across runs.

`route_id` comes from a sort of `route_short_name`, which is what makes two schedules the same route
- operator, origin, destination and mode - rather than from `schedule.id`, which was whichever trip
reached the route first. `service_id` comes from a sort of the calendar's own identity, its date
range, day mask and exclusions, rather than from the order the schedules arrived in.

`trip_id` is already done, by a different mechanism than this ticket assumed: #121 makes it the
string `TUID_runsFrom_runsTo` rather than an integer from a sort, which needs no global ordering at
all. The STP indicator is deliberately **not** in the key — see §6.6.

**T3 · Canonical output ordering** *(depends T2)* — **done**
Every output file sorted by a declared key before writing. No reliance on engine row order.

| file | key |
|---|---|
| `agency.txt` | `agency_id` |
| `stops.txt` | `stop_id` |
| `transfers.txt` | `from_stop_id`, `to_stop_id` |
| `links.txt` | `from_stop_id`, `to_stop_id`, `mode`, `start_date`, `start_time` |
| `calendar.txt` | `service_id` |
| `calendar_dates.txt` | `service_id`, `date` |
| `routes.txt` | `route_id`, which is the `route_short_name` order |
| `trips.txt` | `trip_id` |
| `stop_times.txt` | `trip_id`, `stop_sequence` |

`stop_times.txt` falls out of `trips.txt`: sorting the schedules by trip ID sorts both, because a
schedule's stops are contiguous and already in sequence.

The key above is what the file is *ordered by*; anything it leaves tied is then ordered by the rest
of the row, read in field-name order so that two sources building the same row differently still
agree. That is not hypothetical - **1,276 of `links.txt`'s 8,518 rows tie on their declared key**,
usually two links between the same pair differing only in the days they run. Without the fallback
their order would be whatever the source returned, which is the thing this ticket exists to remove.

Three other places decided something by arrival order and no longer do. `ScheduleCalendar.id` folded
in its exclude days in the order they were added; they are sorted now. And where two schedules want
the same trip ID, which one takes the `_2` suffix was whichever the index reached first - it is now
the one that sorts later by content, because `Schedule.id` is the row number the source gave the
record and the database and the files number them differently. Neither case occurs in the reference
feed, which is why the byte comparison passed before they were fixed.

The third does occur. A route's `route_desc` carries whether first class is available, which is a
property of a train and not of the line it runs on, and **352 of the 6,184 routes have trips that
disagree**. The description came from whichever trip reached the route first; it now comes from the
one that sorts first. Arbitrary either way, and nothing else about a route moves.

Worth noting how that was found. The cross-source byte comparison could never have caught it: both
sources feed the build through the same merge, so they agree with each other while both differ from
the previous build. Only comparing the content against the previous build did. Byte identity across
two sources proves they agree - it does not prove either is a function of its input.

**What this buys.** The two sources now produce a byte-identical feed from the same files, so
comparing them is `diff` rather than a script that resolves every identifier to what it points at.
The normalising half of T7 can go, and the T10 baselines become a plain byte comparison.

**T4 · Fixture slice tool** *(depends T1)* — **done, tool not committed**
Extracts BS/BX/LO/LI/LT/CR for the given TUIDs plus the transitive association closure, the
referenced MSN A-records **including the header line**, and matching ALF/FLF/ZTR rows into a valid
`RJTTF001.ZIP`. **88 KB**, against a 2 MB budget.

The slicer itself is not in the repository. It needs a real refresh to cut from, which is not
committed either, and it runs once per fixture rather than on every build. What is committed is its
output and, in `apps/dtd2gtfs/fixtures/mini/README.md`, the seeds and the source feed it came from,
so the same slice can be cut again.

**T5 · Mini fixture, committed golden, PR job** *(depends T2, T3, T4)* — **done, partly**
Fixture and golden text files committed; the build runs and diffs on every pull request.
Every case in the Layer 2 list has a named test asserting the specific behaviour, not just the diff.

`apps/dtd2gtfs/src/build.spec.ts` builds the fixture at a pinned `--today` and compares all nine
files against the committed golden, byte for byte - which T3 is what makes readable. It runs in the
ordinary test job: the file source needs no database, so this is the first end-to-end coverage the
build has had in CI at all. `UPDATE_GOLDEN=1 yarn vitest run` takes a change.

Alongside the diff are the Track A invariants, cheap enough to run here rather than waiting for T6:
referential integrity for stops, routes and services, two stops per trip minimum, no calendar ending
before it starts, times moving forward within a trip, unique trip IDs.

**Named cases covered**: the STP stack, an overlay excluding its days from the permanent, a
cancellation inside the window and one that ends before it, a service departing after midnight, the
MSN header parsing as a station, a `(CIE` station projecting into the South Atlantic, z-trains for
each route type.

**Not covered yet**: the activity codes named individually, a single-stop schedule, a calendar that
empties after overlays, the window boundaries, a reversed date range, an all-zero day mask, two
associations for one pair at different locations, an all-permanent overlapping source. The fixture's
README lists them.

One case cannot be covered from this feed: **a schedule with no stop times that is not a
cancellation**. There are none. All **46,497** zero-stop BS records in `RJTTF918.MCA` carry `stp=C`,
where having no stops is correct - so the 6,560 the B0 note attributes to the feed are the
cancellations, not a separate population.

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

Promoted originally because the storage layer was about to be rewritten by an incoming
database-agnostic patch. **That patch is deferred, so the original reason is gone** - and the need
is larger than it was. B22 rewrote how every generated id is assigned during import, and it was
verified by importing three zips by hand and diffing two builds. This harness is what turns that
into something the repository asserts. It does not depend on any of Epic A and the baseline it needs
already exists.

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
`docker-compose.yml`, and make Layer 2 and Layer 5 run on every PR.

Written as a prerequisite for Epic A, which then shipped without it. That is the point rather than a
correction: **every database claim in Epic A, B and C was verified by hand** - a container started
locally, feeds imported by hand, two builds diffed at the shell. None of it is in the repository, so
nothing catches a regression in the importer. B22 changed what 6,140 trips look like and the only
evidence it worked lives in a pull request description.

### Epic B — Correctness

Planned to land on master before the restructure, so the move would be a pure refactor with green
tests either side. It did not happen that way: A and C landed first and B stacked on top of them,
which means the refactor was verified against behaviour that then changed underneath it. The
byte-comparison against the pre-refactor baseline is what stood in for the green-tests-either-side
this sequencing was meant to provide.

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

**B1 · Emit `feed_info.txt`** *(coordinate with B14)* — **done**
Written by the build; `feed_version` from the source DTD filename, which both sources can supply -
the file list for `CifFileSource`, the `log` table for the database.

The dates are **not** the min/max of the emitted calendars, which is what this ticket asked for and
would have been wrong in both directions. GTFS defines them as the first and last day the feed is
*complete* for. The earliest calendar start is routinely years back, because a schedule that began
in 2021 and still runs carries its real start date, and the feed does not describe 2021 - anything
that ended before the build date was never queried. The latest end is routinely 2099 for the mirror
of the same reason. So it is the build window, with the end pulled in when the data runs out first,
which is the only case where the calendars have something to say.

**B2 · Replace `links.txt` with `transfers.txt`** — **done**
Fixed links emitted as `transfers.txt` rows (`transfer_type=2` plus `min_transfer_time`), merged
with the station interchange rows. `links.txt` is behind `--links`/`GTFS_LINKS=1` for one minor
version. `import.ts` swaps the `links` load for `feed_info`; the `links` table stays for the flag.

**The mode, window and days survive as producer extension columns**, not as deletions: `mode`,
`start_time`, `end_time`, `start_date`, `end_date` and the seven day flags. GTFS has no field for a
conditional transfer and no documented pattern for one - unlike platforms, where B23 uses the
pattern the spec already defines - so extending is the honest move and the spec permits it. The
validator raises `unknown_column` (INFO) for the twelve, which the baseline accepts.

**One row per pair, because more than one is invalid.** The primary key of `transfers.txt` is the
stop pair; a repeat is a `duplicate_key` **error**, confirmed by feeding the validator a deliberate
duplicate. The ALF holds one record per window and day pattern, so **8,514 records describe 2,406
pairs** and the pair must be described once. Where several links describe a pair the row is their
envelope: shortest `min_transfer_time`, every mode pipe separated (`TRANSFER|TUBE`), earliest start
to latest end, and a day set if any of them runs on it. 2,114 of the 2,406 pairs have a single mode,
so it is exact for those; for the rest the row says when the connection is available by *some*
means, not by each. `--links` still writes the unsummarised records.

Nothing here is about self transfers: `from_stop_id == to_stop_id` is the documented way to express
an in-station interchange time, the feed has 3,054 of them, and the validator is happy with them.

**A MySQL quirk surfaced doing it.** `getFixedLinks` is a `UNION`, and MySQL returns a TINYINT as a
number from a plain select but as a **string** through a UNION. That was invisible while the rows
went straight to `links.txt`, because `"1"` and `1` both write as `1`. The moment anything compared
them, every day flag turned off - caught by the two sources disagreeing, not by a test. `flag()`
coerces. Worth adding to the list of MySQL behaviours `CifFileSource` documents.

"Documented in `stop_desc`" from the original ticket was dropped: `stop_desc` is on stops and cannot
say anything per-pair.

Feed effect: `transfers.txt` 3,054 -> 5,460 rows, `links.txt` gone by default.

**B3 · Honour `GTFS_RANGE` everywhere** — *merged into T1, and **done** there.*

**B4 · Handle an empty `schedule` table** — **done**
Clear error naming the missing import step instead of `TypeError`.

**B5 · Remove the zip race** — **done**
Zip written after awaited stream completion, in-process (`adm-zip`/`yazl`) rather than shelling out.
No `setTimeout`. `run()` resolves only when the zip exists.

The race was worse than it read. `FileOutput` piped a CSV writer into a file and the build awaited
the *writer*, which finishes when it has handed on its last row, not when the row is on disk - which
is what the `// when node tells you it's finished writing a file, it's lying` comment was working
around. One second was not enough for a 164 MB `stop_times.txt`: taking the sleep out and zipping
immediately produced an archive **60,885 bytes short**, silently. `FileOutput.end` now awaits the
destination streams rather than the writers, and `BuildFeed` awaits every copy before asking the
output whether it has finished, because `copy` only opens its file once its query returns.

So `--gtfs-zip` has been capable of publishing a truncated feed whenever the flush outran the sleep.
The directory output was never affected: the process stays alive until the streams drain.

**B6 · GTFS validator in CI** *(depends B1, B2)* — **done**
A `validate` job builds the mini fixture and runs MobilityData `gtfs-validator` 8.0.1, pinned rather
than latest so the accepted list only moves when somebody moves it. Any ERROR fails.
`validator-baseline.json` holds the accepted notice codes with a reason each; a new code fails, and
so does an accepted one that stops occurring, so the list cannot rot.

**The validator is given the fixture's build date with `-d`.** Several of its rules - feed expiry,
`expired_calendar` - compare the feed to the real clock, so a fixture pinned to a fixed day starts
raising notices simply because time passed. It did: a calendar ending 2026-08-10 became
`expired_calendar` overnight. Pinning both clocks to the same day makes the check a function of the
code rather than of the date it runs.

**The mini fixture has zero errors.** Eleven accepted warnings and infos, each with a reason - the
`714` route type the validator does not know, upper-case MSN names, transfers that really are 36 km
now the tube links are in there.

**The full feed does not, and the job does not cover it** - it needs a 70 MB source and does not
belong in a PR check. Running it by hand against `RJTTF918` found three errors:

| | | |
|---|---:|---|
| `foreign_key_violation` | 36 | the `QHA`/`ZUX` stop times - B15 |
| `point_near_origin` | 2 | `QBN`/`QBS` at 0,0 - B10 put them there deliberately |
| `stop_time_with_arrival_before_previous_departure_time` | 4 | **new, see B24 and B25** |

That gap is real: a green PR check does not mean the published feed validates. Whoever does E2's
nightly should run the validator there.

**B24 · A joined trip visits a station twice with time going backwards** — *investigated; the source is inconsistent, and the feed reports it*

`G38297`/`G38968`, a `JJ` join at Swansea, on three of the six dates the association covers.

Not a passing time read as an arrival - `scheduled_pass_time` is NULL on every row involved - and not
an import fault. The raw MCA says it outright:

```
G38297 overlay 2026-09-27:  LTSWANSEA 0931 0933     arrives 09:33
G38968 overlay 2026-09-27:  LOSWANSEA 0912 0912     departs 09:12
```

Both trains carry a Permanent record for 2026-09-20 to 2026-12-06 and a per-date Overlay. **The
Permanent pair is consistent** - arrive 09:03, depart 09:30 - and **the two overlays are not**: one
was moved 30 minutes later and the other 18 minutes earlier, so the train that joins now reaches
Swansea 21 minutes after the train it joins has left. The join cannot happen as described.

**Decided: represent the data as it is.** The build applies the association and emits the trip that
doubles back, because that is what the feed describes. Refusing a join whose timings cannot work was
considered and rejected for the same reason B25 was left alone: the feed's job is to say what the
source says, and a consumer that sees an impossible trip is seeing something true about the DTD.
Fixing it here would hide the fault from whoever can correct it.

It stays a validator error on the full feed - three of the four
`stop_time_with_arrival_before_previous_departure_time` - and no code changes.

**B25 · A z-train arrives before it left** — *found by B6; **the source is wrong, not us***

`Z03536`: LPY 15:38, LJL arrive 16:00 depart **16:12**, LPY arrive **16:09**. The raw ZTR settles
it - nothing is being read from the wrong field:

```
LOLPY---- 1538 1538
LILJL---- 1600 1612      16001612
LTLPY---- 1609 1609      TF
```

The feed says the bus leaves Liverpool James Street at 16:12 and reaches Lime Street at 16:09.

**Decided: leave it.** The feed represents the source, and the source is what needs correcting.
Clamping the arrival would invent a time, which B10 established this project does not do, and
dropping the trip would lose a service that does run. It stays as a validator error on the full
feed - four stop times out of 2.87 million - until it is fixed upstream.

**B7 · Stop asserting wheelchair accessibility** — **done**
`wheelchair_accessible: 0` until D11 supplies real data. `bikes_allowed: 0` documented in code as
"no information", not "no bikes", so it is not mistaken for a fact later.

`0` is GTFS for *no accessibility information*, not *no access* — that is `2`, which the feed never
emits. So this removes a claim rather than making the opposite one.

The removed claim was `1` on all 276,048 trips. RVAR compliance was mandatory for every mainline
rail vehicle by 2020-01-01, so `1` is defensible for a train; 23% of trips are not trains:

| `route_type` | trips | RVAR |
|---|---:|---|
| 2 Rail | 209,023 | yes |
| 1 Subway | 4,340 | yes |
| 714 Replacement bus | 54,610 | no |
| 3 Bus | 6,939 | no |
| 4 Ferry | 1,136 | no |

Inferring `1` from `route_type` was considered and rejected: it is a regulatory assumption encoded
in code, and the case it gets wrong — a rail replacement coach — is the one where a false `1`
strands somebody. D11 sources it instead. Note that the trip flag is only half the question:
end-to-end access also needs `stops.wheelchair_boarding`, which is D5.

**B8 · `trip_headsign` should be the destination** — **done**
Currently the TUID. Destination station name is available from existing stop data with no external
source. TUID stays available via `trip_short_name`/`trip_id`. D9 later extends this to
"Destination via X".

**B9 · MSN header parsed as a station** — **done**
Header and footer comment records rejected by `MultiRecordFile` before field parsing. Test asserts
the header line yields zero records. The `["S"]` hack removed.

The `["S"]` on `cate_interchange_status` was doing two jobs — surviving the `S` of `FILE-SPEC` and
standing in for the field's null characters. Dropping the argument falls back to `IntField`'s
default of `[" ", "*", "9"]`, and **`9` is a value this field takes**, not an absence: it marks a
subsidiary location. Parsing it as null took those stations out of
`WHERE cate_interchange_status IS NOT NULL` and **16 interchange times out of `transfers.txt`**.

The four possible configurations, since this is easy to get wrong:

| `nullChars` | blank | `9` |
|---|---|---|
| `["S"]` (before) | throws | 9 |
| `[]` | throws | 9 |
| default `[" ", "*", "9"]` | null | null |
| `[" "]` (now) | null | 9 |

`[" "]` is deliberately narrower than the default. The feed contains no blanks in that field
(values are 0, 1, 2, 3 and 9), so nothing else moves. `MSN.spec.ts` pins both the blank and the `9`.

**B10 · Zero eastings project to the South Atlantic** — **done**

The ticket assumed all 46 affected stops were "real places that need real coordinates", which is why
it was blocked on finding an Irish source. They are not. **43 of the 46 need no coordinate, because
nothing in the feed goes there:**

| | stop times | fixed links | outcome |
|---|---:|---:|---|
| 43 CIE stations, easting `00000` | 0 | 0 | not published |
| `QBN`/`QBS` Blackpool bus-tram | 0 | 4 each | published at the default |
| `HVH` Hoek van Holland | 12 | 0 | correct already, exempt from the bounds |

The Irish stations are in the MSN because they are ticketable, but no train in the feed calls at one.
Their entire footprint is a row in `stops.txt` and a self-referencing row in `transfers.txt`. So no
Irish coordinate source is needed to close this.

What it does:

1. An all-zero fixed-width coordinate field parses as absent - the MSN schema gives `easting` and
   `northing` a nullChars list rather than `IntField` gaining a mechanism, since `nullValues`
   already repeats the character to the field width.
2. A coordinate that survives parsing but cannot be a place is also absent. `19500` unwinds to an
   easting of 950,000, well past the eastern edge of the National Grid, and lands in the North Sea.
   That is only visible after projecting, so `toStop` checks the projected point against `Bounds.ts`
   and nulls it if it fails. `HVH` is the one documented exemption.
3. A stop with no coordinate that nothing references is not published, and its transfer goes with it.
4. A stop with no coordinate that something does reference is published at `NOWHERE` - 0,0 - and
   named in a warning. Null Island rather than a plausible centroid: a validator flags it and nobody
   mistakes it for a survey, where a national centre point would hide exactly what needs finding.

`stops.txt` is therefore written after the schedules and links are known, because whether an
unlocated station is published depends on whether anything references it.

Feed effect: stops 3,097 -> 3,054, transfers 3,109 -> 3,054, trips and stop times unchanged. Three
stops remain outside the bounds: `HVH`, which is right, and `QBN`/`QBS` at 0,0 awaiting an override.
Both sources byte identical.

This also fixed a dangling reference B12 left behind: the twelve placeholder stops were removed from
`stops.txt` but their self-transfers were not, and the transfer filter here takes them out. The mini
fixture caught it when the golden was regenerated.

**`SOS` Stromness survives all of it.** It is at 50.80, -3.05 - Devon, not Orkney - from a northing
of `61009` where it should be `70091`: the encoder divided by 1,000 instead of 100, and `1009` is
visible in both. It is in bounds, has no sentinel, and nothing references it, so none of the three
rules touches it. It needs a hand-written override, and it is the standing reminder that the bounds
check catches coordinates that are impossible, not ones that are merely wrong.

NaPTAN is GB-only and will not cover the 43 CIE stations. That no longer blocks anything: they come
back the moment a source can locate them, and `QBN`/`QBS` are GB so D3 covers those two.

**B11 · TCR latitude and longitude are transposed** — **done**
`libs/gtfs/src/data/station-coordinates.ts` had `stop_lat: -0.1306, stop_lon: 51.5163`, placing
Tottenham Court Road in the Indian Ocean. Fixed, and `station-coordinates.spec.ts` now checks all
2,594 entries against `Bounds.ts`. TCR was the only one outside. The same assertion carries over to
`overrides.yaml` in D7.

No allowlist was needed. `HVH` Hoek van Holland is genuinely outside the box but takes its
coordinates from the MSN projection rather than an override, so it never reaches this file. The box
covers Ireland because the CIE stations will need it once B10 gives them coordinates.

**B12 · Drop fictional TOC origin/destination placeholders** — **done**
Twelve MSN records are TOC placeholders, not places — `CH ORIGIN`/`CH DESTINATION` and the
equivalents for EMR, Northern, SWR, TransPennine and CrossCountry. They appeared as stops in the
North Sea, from an easting of 18999 or 19500 against a northing of 69999.

Matched by the `<TOC> ORIGIN` / `<TOC> DESTINATION` name pattern in combination with a `CATZ` TIPLOC
and an invalid coordinate — **not** by `Q` CRS prefix or `CATZ` TIPLOC prefix alone, either of which
would delete real stations (see §3). Excluded from `stops.txt`, stop times dropped, count logged.

Measured on the three month window from 2026-08-10 rather than the 22 first counted, which was a
different window: **18 trips, 36 stop times**. Every one of the 18 has exactly two stops and both
are placeholders, so each drops to zero stops and is removed whole by the existing
`stopTimes.length > 1` filter - no trip is left truncated. All 18 are z-trains, consistent with
their being replacement-bus placeholders.

That z-train origin is why the exclusion lives in `ScheduleBuilder` rather than in the queries: the
passenger query joins `physical_station` and could have filtered there, but the z-train query takes
its stop id straight from the ZTR location and never meets that table.

The match is checked against the data it has to survive. The name pattern alone happens to be exact
today, and the other two signals are there so it stays safe: 121 stations have a `CATZ` TIPLOC,
mostly real CIE stations, and 59 are outside the bounds, which is every CIE station until B10
lands. Either signal alone deletes real places.

Feed effect: stops 3,109 -> 3,097, trips 276,048 -> 276,030, stop times 2,868,101 -> 2,868,065.
Both sources byte identical. The mini fixture carries `QXO`/`QXD` and two trips calling at them, so
the golden shows the removal.

**B13 · Platform number is in the wrong field** — **done**
`stop_headsign` is null. It overrides the trip headsign at a stop — it means "this service
terminates here", not "platform 3" — so with B8 giving the trip headsign a real value for the first
time, leaving the platform there would have overridden it at every call.

The platform is dropped from `stop_headsign` rather than moved: `stops.platform_code` needs the
station hierarchy, which is F3. `StopTime.stop_headsign` is typed `null` rather than `Platform`, so
putting something back there is a deliberate act. B23 restores the data itself.

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

**B15 · Z-train stop times reference stops that do not exist** — **done**

36 calls pointed at `QHA` (31) and `ZUX` (5). Emitting a stop for them was the other option in the
ticket and is not available: they are in `z_stop_time` and **nowhere else** - not `physical_station`,
not even `tiploc` - so there is no name and no coordinate to build one from. D4 may map them later.

So the calls go, and the count is logged. Every affected trip had two stops, so 31 fall to one call
and are dropped whole by the existing filter; a trip from a real station to a station that does not
exist was never usable. Sequence numbers are rewritten after a call is removed - GTFS only asks that
they increase, but a renumbered trip reads like one that never had the problem.

Feed effect: trips 276,030 -> 275,999, stop times 2,868,065 -> 2,867,998. **`foreign_key_violation`
is gone from the validator.**

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

**B17 · Download commands never exit** — **done**
`DownloadCommand.run` closed the SFTP connection but never the database pool, so the process hung
after the transfer completed. Harmless interactively, fatal for a scheduled job - E2 would hang
until the workflow timeout.

A5 already took the database out of `DownloadCommand` itself; the pool it leaves open belongs to
`LogTableFeedCursor`. Rather than have that one command close a pool it does not own, `container.ts`
tracks the pools it creates and `index.ts` closes them when the command resolves. That covers every
command, not just the one that was noticed, and a command that already closes its own pool - the
GTFS build does - is tolerated rather than made to throw.

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

**B19 · STP indicator constants never match the feed** — **fixed by #121**
`b12ad68` set the constants to `"P"` and `"N"` and removed the guard, which is both halves of what
this ticket asked for. Verified rather than assumed: no production code references `STP.Permanent`
any more, only specs. The rest of this entry is kept for the reasoning.

`STP.Permanent` was `"Previous"` and `STP.New` was `"Next"`, since `94b2834`. The feed carries `P` and
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

**B22 · The incrementals' stop times and z-trains never reach the database** — **done**, bar 27 trips

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

**Done, all but 27 trips.** `setLastScheduleId` is now `restoreIdCounters`, which walks every record
in every file being imported, finds the ones that generate an id, and continues each from
`MAX(id)` on its own table. The name of a record is the name of its table, so there is nothing to
keep in step as records are added - the previous code restored exactly one counter and had no way to
notice the others existed.

Measured by importing `RJTTF918`, `RJTTC919` and `RJTTC920` into an empty database and building
against the same three zips read as files:

| | before | after |
|---|---:|---:|
| trips the file source has and the database does not | 6,140 | **27** |
| trips the database has and the file source does not | - | **0** |
| files that differ, of nine | 3 | **2** |

`agency`, `calendar`, `calendar_dates`, `routes`, `stops`, `transfers` and `feed_info` are now byte
identical across the two sources on the three-zip feed, which they never were.

**The residual 27 are all z-trains** - `Z04870` onwards, from the incrementals' ZTR. They collide on
the *unique key* rather than on an id: an incremental reissues a z-train with the same `train_uid`,
`runs_from` and `stp_indicator`, and `INSERT IGNORE` keeps the original.

**`REPLACE` was tried and is not the answer.** It looks obviously right - applying feeds in order
should mean the later one wins - and it fixed 19 of the 27. But it broke agreement on the other 8,
because the file source does not apply those revisions either:

```
cif has  Z04870_20260723_20991231     the original from RJTTF918
db then  Z04870_20260723_20271231     the revision from RJTTC919
```

Both sources previously kept the original and agreed. `REPLACE` made the database take the revision
and the file source not, turning 27 one-way differences into 8 two-way ones and pulling
`calendar.txt` and `calendar_dates.txt` out of agreement as well. Reverted.

So the open question is not "how do we make the revision win" but **which source is right about
these 27**, and that has to be settled against the DTD specification for a reissued ZTR record
before either side changes. The database is the specification everywhere else in this project, which
argues for changing the file source - but the file source applies 19 of the revisions and not the
other 8, so it is not consistent with itself either. Needs its own ticket and a proper look.

The orphan cleanup added while trying `REPLACE` is kept: `z_stop_time` rows whose `z_schedule` is
gone were never deleted, and it now runs for every import rather than only when a CFA is present.
It moves the T10 baseline, so it rebaselines under T8.

**B23 · Platforms as child stops, with NaPTAN identifiers** *(depends B13)* — **done**, no flag

B13 took the platform out of `stop_headsign` and nothing carries it, so the export loses a field the
feed supplies. The data is not gone — `stop_time.platform` in the database, the `LI`/`LO`/`LT`
records in the CIF — only the GTFS output drops it.

This was first planned as a producer extension column on `stop_times.txt`, on the grounds that it
cost one column and fragmented nothing. That was the wrong call. The
[stops.txt best practices](https://gtfs.org/documentation/schedule/schedule-best-practices/#stopstxt)
are explicit that a station with multiple boarding facilities should be described with the types the
spec already has:

> Many stations or terminals have multiple boarding facilities...feed producers should describe
> stations, boarding facilities (also called child stops), and their relation.

A station is `location_type=1`; each boarding facility is `location_type=0` with `parent_station`
pointing at it; and the child's name should identify both — their example is "Chicago Union Station"
with a child "Chicago Union Station Platform 19". A non-standard column expresses none of that, and
every consumer would need bespoke code to read it. A child stop is understood by everything.

**The ids are NaPTAN's, on review.** The first cut invented `PAD_A` under `PAD`, on the grounds that
it needed no external data. @miklcct pointed out on #131 that it does not have to invent anything:
the ATCO code for a rail stop is `9100` and the TIPLOC, the station's stop area is `910G` and the
TIPLOC, and both are in the timetable already. A feed in those identifiers merges with the DfT's
GTFS rather than sitting alongside it as a parallel universe of the same railway, so the id scheme
that was F3's moves here — see the field layout decision in §6 — and the three-letter join breaks
once rather than twice.

| | station row | boarding point | call with no platform |
|---|---|---|---|
| `stop_id` | `910GCLPHMJC` | `9100CLPHMJC15` | `9100CLPHMJC` |
| `stop_code` | `CLJ` | `CLJ` | `CLJ` |
| `stop_name` | Clapham Junction | Clapham Junction Platform 15 | Clapham Junction |
| `location_type` | `1` | `0` | `0` |
| `parent_station` | — | `910GCLPHMJC` | `910GCLPHMJC` |
| `platform_code` | — | `15` | — |

**A boarding point takes the TIPLOC of the timing point, not of the station.** Clapham Junction's
West London and Main Line platforms are `9100CLPHMJW3` and `9100CLPHMJM11` under `910GCLPHMJC`,
which is how NaPTAN names them and what the TIPLOC → CRS join the sources already do makes
available: the call knows its own TIPLOC, and the CRS says which station it belongs to. A z-train's
location is a CRS code rather than a TIPLOC, so those calls fall back to the station's own.

`stop_code` becomes the CRS, on the station and on every stop beneath it. GTFS defines `stop_code`
as the code a passenger sees, which CRS is — it is on the ticket and the departure board — and
`stop_id` as a dataset key, which is what the ATCO code is. It also keeps the three-letter code in
the feed rather than removing it.

**What the data actually holds.** Measured on the database's public calls (4,034,934 rows, of which
2,467,114 carry a platform) there are **3,750 station-platform pairs**. 3,705 are platform-shaped —
`1`, `13`, `A`, `3A`, `4B`. The remaining **45 are not platforms at all**: `DF`, `UM`, `DM`, `DPL`,
`UGL` and friends are running-line designations that describe which track a service takes, and
turning those into boarding facilities would invent places passengers cannot stand on. So the value
has to be filtered to `^[0-9]{1,2}[A-Z]?$|^[A-Z]$` before it becomes a stop; a call carrying anything
else references the station. `BAY` is a real designation and is a deliberate casualty of that
pattern — worth revisiting, not worth special-casing first time.

**This is a breaking change** for every consumer joining on a three-letter code, because no id in
the feed is one any more. Shipped without a flag, by decision. `transfers.txt` references stations,
which are `910G` rows.

**Every call gets a boarding point, whether or not it names a platform.** Once a station is
`location_type=1` no stop time may reference it, so a station where some calls name a platform and
some do not needs somewhere for the others to point — splitting one regardless produced **907
`location_with_unexpected_stop_time` errors**. The suffix-less `9100CLPHMJC` is that somewhere, and
it is a stop in its own right rather than a workaround: it is what NaPTAN calls the station's access
node.

That is what makes the first cut's limitation go away. It could only split a station where *every*
call named a platform — 335 stations, 729 platforms, out of 3,750 station-platform pairs — and the
other 909 stations published none of theirs. Every station is now `location_type=1` and every pair
is published: **3,097 stations with 6,139 boarding points**, `stops.txt` 3,054 rows → 9,193.

A station nothing calls at in the window is a childless `location_type=1` row, which the validator
notes as `unused_station` (INFO, 87 in the fixture and 311 in the full feed). It is accepted in the
baseline: whether a station has a boarding point should not depend on whether the three months the
feed covers happen to contain a call at it.

**The id belongs to the output, not to the model.** The first attempt composed `PAD_A` in
`ScheduleBuilder`, which is upstream of overlays, associations and merges - so the domain saw stop
ids that were no longer CRS codes, and **every association silently stopped applying**, because an
association names a bare CRS. 56 fixture trips changed and some lost every stop. Route names split
by platform too, 20 to 30 in the fixture, and headsigns read "Sevenoaks Platform 3".

Patching `stopAt`, `before`, `after`, `origin` and `destination` to compare stations made the
symptoms go away and left the cause: a GTFS presentation detail had been pushed into the timetable
model. `StopTime.platform` carries it instead, `stop_id` stays a CRS through every transform, and
`toStopTimeRow` composes the id when `stop_times.txt` is written. Those five compensating changes
are gone, and the feed is byte for byte what the first attempt produced.

`StopTime.tiploc` joins it for the same reason, and `Stop` carries `crs` and `tiploc` as internal
fields that `toStopRow` projects out. Every index the build keeps — which stations are published,
what a trip's headsign is, which pair a transfer describes — is on the CRS, because that is what a
schedule, an association and a fixed link name a station by.

Feed effect: stops 3,054 -> 9,193. Trips, stop times, routes and transfers unchanged. Both sources
byte identical.

Knock-ons: `StopTime` needs the platform back from the source row, which B13 stopped carrying, and
the TIPLOC with it - which neither source was passing on, though both have it; and a trip may
reference a platform at one call and the station's own boarding point at the next, which is valid
and should be visible in the fixture.

`stop_headsign` stays null. It means "this service terminates here", and B8 now puts a real
destination in `trip_headsign` for it to override.

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

`--source` takes a zip or a directory and repeats, `--out` writes a zip or a directory depending on
the extension, and `--today` and `--range` come from T1's build context.

A directory contributes every `RJTTFxxx.ZIP` and `RJTTCxxx.ZIP` in it, ordered by sequence number
and starting at the most recent full refresh. Ordering by sequence is not the same as ordering by
filename - as text every `RJTTC` sorts before every `RJTTF`, which would apply the refresh after the
incrementals that amend it - and starting at the last refresh matters because a directory that feeds
are downloaded into accumulates more than one cycle. E2 wants the same rule.

**C5 · Rail Data Marketplace credential path** *(depends A5)* — **not in this pass**
The NRDP (`opendata.nationalrail.co.uk`) was retired in early 2026; an account now comes from a Rail
Data Marketplace subscription (`raildata.org.uk`). The SFTP host still serves the files, so nothing
about the transport has changed and downloads work as they always did - only where the username and
password are obtained has moved, and anyone with credentials already is unaffected.

Deferred with C4. It was built once and closed unmerged (#132): a `FeedTransport` seam so
`DownloadCommand` does not depend on the SFTP client, credentials resolved in one place, and an
error naming raildata.org.uk instead of failing at the handshake. Worth picking that up from the
closed PR rather than starting again if it is ever wanted.

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

**D1 · `Enricher` SPI, `MutableFeed`, provenance** *(depends A6)* — **done**

**Fetch and apply are separate, and dependencies are separate from priority.** Fetching is slow and
independent - a NaPTAN download, an API call, an OSM extract - so every enricher fetches at once and
twelve of them is one download rather than twelve in a queue. It also lets a test drive `apply` from
a fixture with no network, which is what the mini fixture needs, and gives caching one place to
live. `fetch` therefore **cannot see another enricher's output**, or the feed at all; an enricher
that wants to narrow what it fetches must fetch broadly and narrow in `apply`.

`dependsOn` decides the order `apply` runs in, because OSM pathways cannot join platforms NaPTAN has
not created yet. `priority` decides who wins a contested field. Conflating them - which the first
attempt did, ordering by priority - produces an order that looks deliberate and is not. Everything
that can be rejected is rejected before any fetch: an unknown dependency, a duplicate key, a cycle.
A build that has downloaded four sources and then finds a circle has wasted the expensive part and
left the feed half enriched.

`MutableFeed` indexes the feed and is writable only through `set`, so every change has an author and
a priority and nothing can quietly overwrite something better. `Provenance` keeps the winning write
and every write that lost, which is what makes "the coordinate is wrong" answerable: NaPTAN said
this, OSM said that, NaPTAN won because it is 50 and OSM is 30.

**Not last-writer-wins**, and tested as such: the same enrichers in either order produce the same
feed. Order dependence here would be the same class of defect as the route numbering that depended
on which trip arrived first, and it would be far harder to notice.

Equal priority is a real conflict. It cannot be resolved on merit, so it resolves on enricher id -
arbitrary but stable - and is **counted**, because a conflict count above zero means two sources are
fighting over a field and somebody has to decide which should outrank the other. Agreement at equal
priority is not a conflict.

`EnrichmentReport` carries matched, unmatched and conflicts. `unmatched` is the number an enricher
is tempted not to report and the one that matters: a source matching 12 stations of 3,000 has added
noise, and nothing else would say so.

**Only the stops are offered to an enricher.** Trips and routes stream straight to their files
rather than being held, and materialising 276,000 trips to enrich a handful is the wrong trade until
something needs it - D9 is the first that will, and it can pay for it then.

The build takes an empty enricher list until D2 wires the config, and produces a byte identical feed
with one. `provenance.json` is written only when an enricher ran.

**D2 · Build config format and CLI wiring** *(depends D1, C3)* — **done**
`gtfs.config.yaml` selecting source, out, today, range, links, licence tier, enrichers and
extensions. `dtd2gtfs build --config`. A flag given as well wins, so a config is a starting point
rather than a commitment, and `today` and `range` reach `buildContext` the same way the environment
does so precedence is decided in one place.

**Validated by hand rather than by a schema library.** The errors are the reason the file exists -
`must match schema #/enrichers` helps nobody at 3am when a nightly did not build. So an unknown
option is named and the valid ones listed, a bad licence tier says which are allowed, and every
message is prefixed with the file, because three configs in play makes an unattributed error a
puzzle.

**An unknown enricher fails immediately**, against the registry of what the build has, listing what
is available. Left to run it would produce a feed quietly missing whatever that source was meant to
add - indistinguishable from a source that matched nothing.

**`apply:` is enforced in `MutableFeed.set`**, not asked of the enricher, because an allowlist an
enricher is trusted to honour is not an allowlist. It exists so a source can be taken for the one
thing it is good at: NaPTAN has excellent coordinates and station names that are not the ones on the
departure boards, and there is no reason to accept both to get one. Refused writes are counted, so
a list that turns away everything an enricher does is visible rather than a config that reads as
enabling a source and does nothing.

Enrichers are sorted by key when parsed, so the same config produces the same build however it was
typed. `yaml` is a real dependency of `apps/dtd2gtfs` now; the validator itself takes a parsed object
and has none, so it is testable without it.

**D3 · `@gb-rail/enrich-naptan`** *(depends D1)* — **done**, coordinates only

OGL, so it is in the permissive tier. It joins on **TIPLOC, not CRS** - a NaPTAN rail record is
`9100` and then the TIPLOC, which is `stop_code` here - which is why the station's own TIPLOC had to
be published before this could work at all.

**2,622 of 3,054 stations matched.** The 432 that did not are bus, coach, tram, ferry, Underground,
Metro and heritage stops; NaPTAN's rail records cover railway stations and those live under other
stop types. The report says so rather than leaving a number for somebody to chase.

**Only coordinates.** NaPTAN's name for Aberdare is "Aberdare Rail Station" where the departure
boards say "Aberdare", so taking the name as well is something to ask for through the config's
`apply:` rather than to inflict.

Effect: the median station moves **2 metres** and the 90th percentile 78, which is the OSGB
projection being roughly right all along; the tail is what matters, out to 3.8 km. `QBN`, `QBS` and
`HVH` are still outside the bounds - the first two have no NaPTAN record and the third is correct.

**Two things worth knowing before writing another enricher.**

NaPTAN ships rail records with the position left blank - Bond Street, Tottenham Court Road and
Barking Riverside among them. `Number("")` is 0 rather than NaN, so the emptiness survived the
finite check and three London stations were moved to the Gulf of Guinea, including the one whose
coordinate had just been corrected by hand. **Nothing failed**: the run reported 2,628 happy
matches. It was found by measuring how far each stop moved, which is now the thing to do to any
enricher before believing it.

`provenance.json` was being written through the CSV writer, so it came out as a column of
`[object Object]`. `GTFSOutput` gains `write` for files that are documents rather than tables.

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

**D11 · Vehicle wheelchair accessibility** *(depends D1, C5)*
`trips.wheelchair_accessible` from real data, replacing B7's `0`. Distinct from D5, which supplies
`stops.wheelchair_boarding` — station step-free access and vehicle capacity are different questions
and a rider needs both, so B7's original forward reference to D5 was wrong.

Source from the Rail Data Marketplace — <https://raildata.org.uk/dataProducts?textSearch=wheelchair>
— reusing D5's RDM token and disk cache. Product selection at implementation time; the catalogue is
behind a JS app and has not been read.

The value is per *vehicle*, and the feed has trips, so the mapping depends on what the product is
keyed by. Where nothing resolves, trips stay at `0` rather than inheriting a mode-level guess.
Coverage report by operator, as D10.

**D12 · `@gb-rail/enrich-station-groups` — `areas.txt` and `stop_areas.txt`** *(depends D1)*

RDG group stations: four-digit NLC groups such as `1072` "London Terminals" covering Euston,
Waterloo, King's Cross and 15 others. Useful for journey planning and required for honest fares.

GTFS has no station-of-stations — `parent_station` is forbidden on a `location_type=1` station, and
the hierarchy is exactly one level, so groups cannot be modelled as nesting. **`areas.txt` +
`stop_areas.txt`** (Fares v2) is the right structure and not a workaround: an area is a flat set of
arbitrary stops with no nesting rules and no exclusivity, so a station can sit in London Terminals
and a travelcard zone at once, and group stations are a ticketing construct to begin with.

`transfers.txt` is the wrong tool for this — it asserts you can walk between the stops, which is
false for Euston and Waterloo.

The NLC identity is already in the **timetable** feed: the MCA `TI` record carries `nalco`, whose
first four digits are the NLC. It lines up with the fares UIC exactly — `70` + NLC + check digit:

```
EUSTON  144400 N  EUS   ←→  7014440
WATRLOO 559800 Q  WAT   ←→  7055980
```

What the timetable feed lacks is *membership*. The fares feed has it and it is already parsed and
imported — `location_group` (816 rows) and `location_group_member` (1,384 rows; 740 groups with
members, 540 distinct CRS, 537 resolving to a TIPLOC). But the file source reads `RJTT*` only, so
taking membership from `RJFA` would make the database and file sources disagree and break the
byte-identity check that T9 relies on. An enricher keeps both sources equal and is the plan of
record; RDM is expected to publish a group-stations product, to be confirmed at implementation time.

Two things to get right. **58 groups have more than one date range** — select the row valid at the
build date or `area_id` duplicates. And the table mixes true station groups with travelcard zones
(`LONDON ZONES 1-3`) and bus groups (`HEATHROW BUS`); all are legitimate fare areas, so emit all and
make the kind legible in `area_name` rather than silently filtering.

Coordinate with F5, which scopes `networks`/`areas` from the routeing guide. D12 owns group
stations and lands first; F5 extends the same two files.

### Epic E — Publishing

**E8 · Fix the npm release pipeline** — **done**, in two halves

Publishing had been broken since 2025-12-02: npm had 6.6.3 while git carried tags through v6.6.9,
and `npm publish` returned `404 Not Found - PUT .../dtd2mysql`, which is npm's answer to an
*unauthorised* publish rather than a missing package.

**The authorisation half is fixed on master.** `7398148` dropped the `NPM_TOKEN` secret for trusted
publishing over OIDC, so the credential is minted per run and the publish carries a provenance
attestation. It works: **6.6.14 and 6.6.15 are on npm**. The registry still shows the gap - 6.6.3
straight to 6.6.14 - which is the ten phantom versions the broken runs burned.

**The other two defects are fixed by Epic A**, in the workflow that replaces this one:

- `npm version patch` and `git push --follow-tags` ran **before** `npm publish`, so a failed run
  still burned a version and pushed a tag. Master still has that order; the monorepo's Release
  workflow hands both to `changesets/action`, which opens a "Version Packages" pull request instead
  of bumping in place, so there is no window where a tag exists for a version that was never
  published.
- The workflow triggered on every push to `master` with no path filter, so a documentation commit
  attempted a release. The replacement filters on `apps/**`, `libs/**`, `.changeset/**` and the
  manifests.

So E8 closes when the stack merges. Nothing more to do for it.

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

**F3 · Station entrances and the rest of the node set from NaPTAN** *(depends D3, D4, B23)* —
**closes #69**

**The ids and the field layout are no longer part of this.** B23 publishes the ATCO codes and moved
CRS to `stop_code`, because neither needs NaPTAN: `9100` plus the TIPLOC is the ATCO code for a rail
stop, and the timetable carries the TIPLOC. What is left is what genuinely needs the external node
set.

NaPTAN supplies it under OGL, so this does not depend on OSM: `RSE` (4,543 **station entrances**),
and `RPL` (**rail platforms**) to check the platforms B23 derives against the ones NaPTAN records —
a platform in the timetable that NaPTAN does not have, or the reverse, is a data quality signal
worth reporting. OSM is then needed only for pathway *edges* and lift/stair attributes in D6, which
materially reduces the ODbL exposure there.

Remaining `stops.txt` changes:

| field | now | proposed |
|---|---|---|
| `location_type` | B23 sets `1` and `0` | adds `2` entrance |
| `parent_station` | B23 sets it on boarding points | adds entrances |
| `stop_desc` | `cate_interchange_status` | free text; interchange status is already carried by `transfers.txt` |

B23 broke the three-letter join once, with the ids it will keep. F3 adds stops rather than renaming
them, so it needs no flag and no second break.

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
E8, T14  →  B1,B2,B4,B5,B7..B23  →  T1,T2,T3  →  T4,T5,T9,T11..T13  →  T10  →  T6,T6b,T7
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

**84 tickets** listed (B22 was found while building C2; B23, D11 and D12 came out of reviewing the
B4–B13 batch; B24 and B25 were found by B6's validator on its first run).

B3 is absorbed into T1. **35 are done** — T1–T5, A1–A3, A5–A10, C1–C3, B0, B1, B2, B4, B5, B6,
B7–B9, B10–B13, B15, B17, B22, B23, D1, D2, D3, T8, T9, T10, T11, T12, T13, T6b and E8 - the last of
those across master and Epic A. B14, B16,
B18, B19, B20 and B21 are resolved by #121. A4, C4 and C5 are deferred out of this pass. B24 and
B25 are investigated and closed as source data the feed reports rather than corrects.

That leaves **26 in scope** — 25 untouched and T7 partly done — all of them in D, E, F or the
remainder of T.

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
3. **Field layout** — *revised, and landed in B23.* CRS moves to `stop_code`, `stop_id` becomes the
   NaPTAN ATCO code, `platform_code` is introduced, and `location_type`/`parent_station` are
   populated. Full before and after table under B23.

   This was to wait for F3 and NaPTAN, behind a flag, with CRS-only stops as the default for a
   release. Both parts are superseded. **The ATCO code needs no external data** — it is `9100` or
   `910G` and a TIPLOC, and the timetable carries the TIPLOC — so there is nothing to wait for. And
   **there is no flag**, for the same reason B23 has none: the alternative is to break the
   three-letter join twice, once for `PAD_A` and again for the ATCO form, and a consumer would
   rather be broken once. Raised by @miklcct in review of #131, and agreed.

   `agency_id` moves with it, to the National Operator Catalogue form — `=SN`, `=AW`. A bare two
   letter code is an airline in the NOC, and the equals sign is how it distinguishes a rail
   operator. The point of both is the same: the feed can be merged with the DfT's bus and metro
   data as it stands, rather than sitting beside it in identifiers only this project uses.
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
