# Migrating from `moment` to `Temporal`

## Why

`moment` has been in maintenance mode since 2020. Now that the minimum supported runtime is Node 26,
`Temporal` is available as a global with no dependency and no polyfill, so the `moment` dependency can be
dropped outright rather than swapped for another library.

Two facts that make this cheap:

- Node 26 ships `Temporal` natively (implemented via `temporal_rs`; Node 26 even exposes `Temporal.Instant`
  on `fs.Stats`). Node 24 does not, which is why the engine floor moved.
- TypeScript 7.0.2 ships `lib.esnext.temporal.d.ts`, and `lib.esnext.d.ts` references it. The existing
  `"lib": ["esnext"]` in `tsconfig.json` already brings the `Temporal` namespace into scope — **no type
  package, no `@types` shim, no polyfill is needed**.

## Scope

Nine files. `moment` is used in exactly two ways, and it is worth treating them as two separate migrations
because the risk profiles are completely different.

### Group A — calendar dates (the real work)

| File | Usage |
| --- | --- |
| `src/gtfs/native/ScheduleCalendar.ts` | The core. `runsFrom`/`runsTo`/`excludeDays` as `Moment`, plus all date arithmetic |
| `src/gtfs/native/Association.ts` | `moment.max`/`moment.min` when clipping a schedule to an association |
| `src/gtfs/repository/CIFRepository.ts:158-159` | `moment(row.start_date)` from a DB row |
| `src/gtfs/repository/ScheduleBuilder.ts:79-80` | `moment(row.runs_from)` from a DB row |
| `test/gtfs/native/ScheduleCalendar.spec.ts`, `test/gtfs/native/Association.spec.ts`, `test/gtfs/command/ApplyAssociations.spec.ts`, `test/gtfs/command/MergeSchedules.spec.ts` | Construct fixtures |

These are all whole days with no time and no zone → `Temporal.PlainDate`.

### Group B — clock durations (nearly free)

`src/gtfs/native/Association.ts` only. `moment.duration(...)` is used on `"HH:MM:SS"` strings, and the
only operations performed are `.asSeconds()` and `.add(1, "days")`. The result is immediately fed to
`formatDuration(seconds)` from `src/gtfs/native/Duration.ts`, where the project's own `Duration` type is
already `number` (seconds).

**Recommendation: do not reach for `Temporal.Duration` here.** `Temporal.Duration.from()` only accepts ISO
8601 (`PT6H30M`), not `"06:30:00"`, so using it would mean writing a parser *and* keeping a second duration
representation alongside the existing `Duration = number`. Replace `moment.duration` with a small
`parseDuration(hhmmss): number` next to `formatDuration` and do the arithmetic in seconds. This deletes
code rather than adding it.

Note this must keep handling **times past 24:00** (`"25:30:00"`), which GTFS uses for post-midnight stops
and which `moment.duration` handled implicitly.

### Group C — `src/cli/CleanFaresCommand.ts`

Standalone, no shared types with the rest, and has an error-handling wrinkle (below). Migrate it last and
independently.

## The four behaviours that will bite

These are the things that are not mechanical find-and-replace, listed in the order they are likely to
cause a wrong-output bug rather than a compile error.

### 1. Day-of-week is renumbered

`moment().day()` returns **0 = Sunday .. 6 = Saturday**. `Temporal.PlainDate.dayOfWeek` returns
**1 = Monday .. 7 = Sunday** (ISO). The `Days` interface in `ScheduleCalendar.ts` is keyed `0..6` with
`0` = Sunday and is indexed directly by `.day()` in five places, and it is also written out positionally
in `toCalendar()`, `shiftForward()` and `shiftBackward()`.

Do **not** renumber the `Days` interface — it maps onto the GTFS calendar columns and onto the CIF row
order, and changing it would ripple into `CIFRepository`, `ScheduleBuilder` and every test fixture.
Instead add one conversion at the boundary:

```ts
const dayOfWeek = (d: Temporal.PlainDate) => (d.dayOfWeek % 7) as keyof Days; // 7 (Sun) -> 0
```

This is the single most likely place to introduce a silent off-by-one, so it should get a direct unit test
covering all seven days.

### 2. `Temporal` objects are immutable; `Moment` objects are not

The current code mutates in place, in loops and even inside `while` conditions:

- `ScheduleCalendar.clone()` (lines 116-123) mutates its `start` and `end` **arguments**.
- `sharedDays()` (line 79) mutates its local cursor.
- `canMerge()` (line 183) and `merge()` (line 201) call `startDate.add(1, "days")` *inside* the loop
  condition, relying on the mutation-and-return.

Every one of these becomes a reassignment:

```ts
// before
while (startDate.isSameOrBefore(endDate)) { ...; startDate.add(1, "days"); }
// after
while (Temporal.PlainDate.compare(cursor, endDate) <= 0) { ...; cursor = cursor.add({ days: 1 }); }
```

The `while (startDate.add(1, "days").isBefore(...))` pattern needs care: it advances *before* the first
comparison, so the naive rewrite changes which day the loop starts on.

The upside is that `clone()` mutating caller-owned arguments is a latent aliasing bug today — every call
site currently defends against it with `.clone()`, and all of those `.clone()` calls disappear. In
`Association.apply()` and `mergeSchedules()` the defensive clones can go too.

### 3. `Temporal` throws where `moment` returned an invalid object

`CleanFaresCommand.getFirstDateAfter()` builds a date from a `YYYY` + `MMDD` string concatenation and the
caller checks `.isValid()`. `Temporal.PlainDate.from()` throws a `RangeError` instead of returning an
invalid value, and by default `from()` is `constrain`, not `reject`.

The concrete case: a restriction month of `0229` in a non-leap year. Today it yields an invalid `Moment`
and the record is logged and skipped. Under `Temporal` it will either throw (with `overflow: "reject"`) or
silently become 28 February (the `constrain` default). Neither matches current behaviour by accident —
pick deliberately, and preserve the existing log-and-skip by wrapping in `try`/`catch` with
`overflow: "reject"`.

### 4. `Date` → `PlainDate` needs a timezone decision

`CIFRepository` and `ScheduleBuilder` call `moment(row.runs_from)` where the value is a JS `Date` produced
by mysql2 for a `DATE` column — i.e. **local midnight**. Converting a `Date` to a `PlainDate` requires
naming a time zone, and getting it wrong shifts every schedule boundary by a day for half the year.

Do not convert. Set `dateStrings: true` on the mysql2 pool in `src/cli/Container.ts:173` (and the streaming
pool at `:181`, if those rows carry dates) so `DATE` columns arrive as `"2017-07-01"`, then use
`Temporal.PlainDate.from(row.runs_from)` with no zone involved at all. This removes an existing
timezone-sensitivity from the codebase rather than porting it.

`dateStrings: true` is pool-wide, so audit other consumers of `DATE`/`DATETIME` columns before flipping it.
`CleanFaresCommand.applyRestrictionDates()` reads `restriction_date.start_date` as a `Date` and calls
`.getFullYear()` on it — that has to move to string parsing in the same change.

## Translation table

| `moment` | `Temporal` |
| --- | --- |
| `moment(dateString)` | `Temporal.PlainDate.from(dateString)` |
| `d.clone()` | *(delete — immutable)* |
| `d.add(1, "days")` | `d.add({ days: 1 })` (returns new) |
| `d.subtract(1, "days")` | `d.subtract({ days: 1 })` |
| `d.format("YYYY-MM-DD")` | `d.toString()` |
| `d.format("YYYYMMDD")` | `d.toString().replaceAll("-", "")` |
| `d.day()` | `d.dayOfWeek % 7` (see #1) |
| `a.isBefore(b)` | `Temporal.PlainDate.compare(a, b) < 0` |
| `a.isSameOrBefore(b)` | `Temporal.PlainDate.compare(a, b) <= 0` |
| `a.isAfter(b)` / `a.isSameOrAfter(b)` | `compare(a, b) > 0` / `>= 0` |
| `d.isBetween(a, b, "days", "[]")` | `compare(d, a) >= 0 && compare(d, b) <= 0` |
| `moment.max(a, b)` / `moment.min(a, b)` | local `maxDate`/`minDate` helpers over `compare` |
| `moment.duration("HH:MM:SS").asSeconds()` | `parseDuration(...)` → seconds (see Group B) |

`moment.max`/`moment.min` have no `Temporal` equivalent and are used in three files, so they belong in a
shared helper module — suggested: `src/gtfs/native/PlainDate.ts`, alongside `dayOfWeek` and the
`YYYYMMDD` formatter.

## Sequencing

Each step keeps the suite green, so any step can be a separate commit or PR.

1. **Add `src/gtfs/native/PlainDate.ts`** with `maxDate`, `minDate`, `dayOfWeek`, `toYYYYMMDD`, plus unit
   tests. Nothing consumes it yet. Add `parseDuration` to `src/gtfs/native/Duration.ts` in the same step.
2. **Group B.** Replace `moment.duration` in `Association.ts` with second arithmetic. Self-contained;
   `Association.spec.ts` covers it. Also drops the unused `Duration`/`Moment` type imports on
   `Association.ts:5`.
3. **Switch the DB boundary to strings** (`dateStrings: true` + `CleanFaresCommand.applyRestrictionDates`).
   Still on `moment`, now `moment(string)` rather than `moment(Date)`. Isolating this means any
   timezone-related test failure is attributable to this commit alone.
4. **Flip `ScheduleCalendar` to `PlainDate`.** The big one — the type change on `runsFrom`/`runsTo`/
   `ExcludeDays` makes the compiler enumerate every remaining call site in `Association.ts`,
   `CIFRepository.ts` and `ScheduleBuilder.ts`. Do the mutation rewrites (#2) and the day-of-week
   conversion (#1) here. Expect this to be most of the diff.
5. **Migrate the four test files.** Fixtures become `Temporal.PlainDate.from(...)`. Prefer the dashed form
   `"2017-07-10"` over the existing bare `"20170710"` for readability — verify basic-format parsing rather
   than assuming it.
6. **`CleanFaresCommand`.** Includes the `.isValid()` → `try`/`catch` change (#3).
7. **`npm uninstall moment`**, confirm no `moment` references remain outside `README.md` (where "at the
   moment" is prose), and check nothing in `dist/` still resolves it.

## Verification

- `npm test` after every step — the existing suite (`ScheduleCalendar`, `Association`, `ApplyOverlays`,
  `ApplyAssociations`, `MergeSchedules`, `CreateCalendar`, `AddLateNightServices`) covers the overlay and
  merge logic, which is where the mutation rewrites are riskiest.
- Add day-of-week tests before step 4, not after.
- Beyond unit tests: run a real GTFS export against a populated database before and after, and diff
  `calendar.txt` and `calendar_dates.txt`. A day-of-week or loop-boundary error is far more likely to show
  up as a handful of wrong rows in a full export than as a red test.
- Run the suite under a non-UTC `TZ` (e.g. `TZ=Europe/London npm test`, and something like
  `TZ=Pacific/Auckland` for a large offset). Any test that only passes in UTC is a leftover `Date`
  conversion.

## Not in scope

- `experimentalDecorators` / `memoized-class-decorator` on `ScheduleCalendar`'s getters — untouched, though
  `@memoize` is safer once the class is genuinely immutable.
- `tsconfig.json` `target`/`lib` — `es2025` + `esnext` already work.
- A polyfill fallback. Node's `Temporal` can be disabled at build time via a configure flag, so an exotic
  custom build could lack it, but supporting that is not worth a dependency. The `engines` floor and the
  README note are the contract.
