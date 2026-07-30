# The `moment` to `Temporal` migration

`moment` has been removed. Date handling now uses the built-in `Temporal` API, which is why the minimum
supported runtime is Node 26 — the first release to expose `Temporal` as a global. No polyfill is
involved, and no type package either: TypeScript 7 ships `lib.esnext.temporal.d.ts`, and the existing
`"lib": ["esnext"]` in `tsconfig.json` pulls it in.

This document records the decisions that are not obvious from the diff.

## Which type

`ScheduleCalendar.runsFrom`, `runsTo` and the values in `excludeDays` are whole days with no time and no
zone, so they are `Temporal.PlainDate`.

Clock durations deliberately do **not** use `Temporal.Duration`. The only durations in the codebase are
`HH:MM(:SS)` stop times, and `src/gtfs/native/Duration.ts` already modelled a duration as a number of
seconds. `Temporal.Duration.from()` only accepts ISO 8601 (`PT6H30M`), so adopting it would have meant
writing a parser *and* carrying two duration representations. `parseDuration` does the job in one line and
keeps handling hours past 24, which GTFS uses for stops after midnight.

## Day of week is renumbered at the boundary

`Temporal.PlainDate.dayOfWeek` is ISO: **1 = Monday .. 7 = Sunday**. The `Days` map is **0 = Sunday ..
6 = Saturday**, matching the GTFS calendar columns and the CIF row order.

`Days` was left alone and the conversion lives in `dayOfWeek()` in `src/gtfs/native/PlainDate.ts`.
Renumbering `Days` instead would have rippled into `CIFRepository`, `ScheduleBuilder`, `toCalendar()` and
every test fixture. `PlainDate.spec.ts` walks a full week explicitly, because this is the easiest place in
the migration to introduce a silent off-by-one.

## Dates come out of MySQL as strings

mysql2 returns a `DATE` column as a JS `Date` at **local midnight**, so converting one to a `PlainDate`
would have required naming a time zone, and picking wrong shifts schedule boundaries by a day for part of
the year.

Rather than port that, the pool sets `dateStrings: true` (`src/cli/Container.ts`) and dates are parsed
with `Temporal.PlainDate.from("2017-07-01")`. The row types already declared these columns as `string`, so
this made the types honest and removed a timezone sensitivity instead of carrying it forward.
`CleanFaresCommand` was the only consumer of the `Date` objects and moved in the same commit.

`dateStrings` is pool-wide. Anything added later that reads a `DATE` or `DATETIME` column gets a string —
`Temporal.PlainDate.from` accepts both the `YYYY-MM-DD` and `YYYY-MM-DD HH:MM:SS` forms.

### What mysql2 does and does not know about Temporal

Reading: nothing. mysql2 3.23 has no option to hand back a `Temporal` value; a date column is either a JS
`Date` or, with `dateStrings`, a string. Parsing the string ourselves is the only route.

Writing through `query()`: supported. mysql2 3.23 escapes via `sql-escaper`, which detects Temporal
values by their `Symbol.toStringTag` and renders a `PlainDate` as `'2017-07-01'`.

Writing through `execute()`: **broken, and quietly.** The prepared statement encoder has no Temporal
branch, and it decides a value is JSON by looking for a `toJSON` method — which every Temporal type has.
A `PlainDate` therefore goes out as a JSON parameter holding the quoted string `"2017-07-01"`, quotes
included, rather than as a date.

This project only calls `query()`, so it is unaffected, and `CleanFaresCommand` passes `.toString()`
rather than the object anyway. But do not assume a `Temporal` value can be bound as a parameter if
anything here ever moves to prepared statements — convert to a string at the call site.

## Temporal throws where moment returned an invalid object

`CleanFaresCommand.getFirstDateAfter` built a date from a year plus an `MMDD` restriction month and the
caller tested `.isValid()`. It now returns `undefined` and the caller checks that; the log-and-skip
behaviour is unchanged. The case that matters is a restriction month of `0229` in a non-leap year.

Worth knowing: **`overflow` only applies to the property-bag form.** `Temporal.PlainDate.from(string)`
rejects an out-of-range date whatever you pass, so `Temporal.PlainDate.from("2017-02-29")` throws rather
than clamping. `getFirstDateAfter` uses the property-bag form with `overflow: "reject"` so the intent is
explicit at the call site.

## Immutability removed a latent bug

`ScheduleCalendar.clone()` used to mutate the `start` and `end` arguments it was handed, and every call
site defended against it with `.clone()`. `PlainDate` is immutable, so those defensive copies are gone.

`canMerge()` and `merge()` used to advance the cursor *inside* the `while` condition
(`while (startDate.add(1, "days").isBefore(...))`). They now advance once before the loop and again at the
end of the body, which visits the same sequence of dates — the naive rewrite would have skipped a day.

## Verifying a change in this area

- `npm test` covers the overlay and merge logic, which is where the loop rewrites were riskiest.
- Run under a non-UTC `TZ` (`TZ=Europe/London npm test`, `TZ=Pacific/Auckland npm test`). Anything that
  only passes under UTC means a `Date` has crept back in.
- For changes to the calendar logic specifically, a full GTFS export against a populated database diffed
  on `calendar.txt` and `calendar_dates.txt` will surface a day-of-week or loop-boundary error that the
  unit tests miss.
