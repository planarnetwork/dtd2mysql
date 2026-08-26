# The mini fixture

`RJTTF001.ZIP` is a slice of `RJTTF918`, the full refresh of 2026-08-04. `golden/` is
the feed it produces at `--today 2026-08-10`, committed as text so that a change in
behaviour arrives as a readable diff rather than as a hash that moved.

`RJFAF001.ZIP` is a slice of the fares refresh `RJFAF847`, holding only the `LOC`
records the station groups extension reads. The real fares feed is 46 MB and
gitignored, so without this the zip and the fixed-width parsing would be covered by
nothing. It holds four `RG` records and their members, all real lines:

| group | for |
|---|---|
| `7010720` | London Terminals, and its 18 members |
| `7000390` | two date ranges over the same group, which 58 real groups have |
| `70J2230` | `BEDFORD+BUS`, a name padded out to its fixed width |

Plus an `RL` location, an `RR` railcard and the `/!!` header, so the records that are
not groups are exercised too.

To take a change: `UPDATE_GOLDEN=1 yarn vitest run`, then read the diff before you
commit it. `apps/dtd2gtfs/src/build.spec.ts` is what compares them.

## What it holds

Seeded from these TUIDs, plus everything reachable from them through associations —
16 in total, 6,951 MCA lines, 205 stations, 39 ALF links, 21 FLF links and six
z-trains, in 88 KB:

| seed | for |
|---|---|
| `C00049`, `C00070`, `C02507` | STP stacks: a permanent with overlays and a cancellation over it |
| `C00072` | a service departing after midnight, which rolls into the previous day |
| `C04569` | a VV divide with a next-day date indicator, and the TUIDs it reaches |
| `C04561`, `C04566` | JJ joins at Carstairs and Edinburgh |
| `C02271`, `C55452`, `W34546` | `BS`, `OL` and `XZ` train categories |
| `C04856` | `train_status=S`, which the query rewrites to the `SS` ferry category |
| `Z81574`, `Z01501`, `Z08101`, `Z08021`, `Z01401`, `Z08001` | one z-train of each category |

The MSN header record is kept deliberately. It begins with `A`, like every station
record, so it parses as one and appears in `stops.txt` as stop `4/0` — the fixture
holds what is wrong as well as what is right. A `(CIE` station is kept for the same
reason: its eastings are zero, so it projects into the South Atlantic.

## What it does not hold yet

- A schedule with no stop times that is **not** a cancellation. There are none in the
  refresh: all 46,497 zero-stop BS records in `RJTTF918.MCA` carry `stp=C`, where
  having no stops is correct.
- Activity codes `R`, `T`, `TB`, `TF`, `U`, `D`, `N` and a null activity, each named.
- A single-stop schedule, a calendar that empties after overlays, schedules starting
  and expiring at the window boundary, a reversed date range, an all-zero day mask.
- Two associations for one pair of TUIDs at different locations, one cancelled.
- An all-permanent source with overlapping records.

Those are the rest of the Layer 2 list in `docs/restructure.md`.
