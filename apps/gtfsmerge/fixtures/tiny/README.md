# The tiny fixtures

Two hand-written feeds, four stops between them, covering what merging two real
feeds does not reach. Each row is here for a reason:

| In | What it covers |
|---|---|
| `a/calendar.txt` `SA1` and `SA2` | Identical calendars with different ids. They must collapse onto one service. |
| `a/calendar_dates.txt` `SA3` | Exception dates with no `calendar.txt` row, so `CalendarFactory` has to synthesise one. |
| `a/routes.txt` `RA2` | A route of a removable type, for `--remove-route-types 3`. |
| `a/stops.txt` `9100ALPHA1` | A stop with a `parent_station`. It is not published; calls at it become calls at `910GALPHA`. |
| `a/stops.txt` `910GBETA` | A stop name containing a quote, which has to survive the write and the read back. |
| `a/trips.txt` `TA1` | A headsign containing a comma, quoted in the file. |
| `a/transfers.txt` row 1 | A `transfer_type` 4 coupling naming two trips, whose ids the merge renumbers. |
| `b/calendar.txt` `SB1` | The same calendar as `a`'s `SA1`, in a different feed. It collapses with it. |
| `b/calendar.txt` `SB2` | A calendar entirely in the past, dropped by the date filter. |
| `b/stops.txt` `910GALPHA` | A stop both feeds describe. The merged feed has one row for it - the reason a GB rail feed and a GB bus feed can be merged without a stop prefix. |
| `b/stops.txt` `9100BUSSTOP` | About 200m from `910GALPHA` at 54N, so a walk transfer is generated between them. |

The feeds are written by hand rather than built, because every one of these is an
edge a builder would have to be coaxed into producing.
