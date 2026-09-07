# End to end tests

These are the tests that cannot live in any one package, because they are about what happens when
the packages meet. A spec goes in one of three places, and which it is says what kind of test it is:

| | |
|---|---|
| `<package>/src/Foo.spec.ts` | A unit test of `Foo.ts`, beside it |
| `<package>/test/*.spec.ts` | End to end for one package — `libs/gtfs-loader/test/GoldenFeed.spec.ts` reads a real feed, `apps/cif2gtfs/test/build.spec.mts` builds one |
| `tests/` | End to end across packages — here |

Not published, and it has no source of its own beyond a stub — everything here is a spec or the
script CI runs.

## `Chain.spec.mts`

The three producers, in sequence, over the fixtures they each commit:

```
cif2gtfs           the mini DTD timetable  ->  a rail feed
transxchange2gtfs  the mini TransXChange   ->  a bus feed
gtfsmerge          both of those           ->  one feed
gtfs-read          the merged feed         ->  the assertions
```

The assertion it exists for is the last one: **a passenger can walk from the train at Amersham to
the bus stop outside it**, in a single feed, with no `--stop-prefix` — because a GB rail feed and a
GB bus feed already agree that a stop is named by its ATCO code. That is the claim that makes these
three tools worth having in one repository, and this is the only place it is checked.

The rest is what has to hold for the merged feed to be usable at all: unique trip ids across the two
feeds, every reference resolving, and the rail feed's `transfer_type` 4 couplings surviving the
renumbering.

It has already earned its place. It found `--no-date-filter` dropping every calendar in every feed —
128 rail trips came out as 14 — which no test inside gtfsmerge could see, because gtfsmerge's own
fixtures pass a date filter.

## `RoundTrip.spec.mts`

Reads every golden this repository commits back — rail, bus and the merge of them — and writes each
out again, byte for byte.

This is the property that justifies one shared schema for reading and writing: whatever the writer
writes, the reader reads, and writing it again produces the same file. A column the reader dropped,
or a value it coerced into something that serialises differently, fails here.

## `PublicSurface.spec.mts`

Scrapes the exported names out of every `libs/*/dist/index.d.ts` and diffs them against
[`type-surface.json`](../type-surface.json), so a rename that would break a consumer is a decision
rather than a surprise. It reads every library, so it spans them all; regenerate with
`UPDATE_SURFACE=1 yarn vitest run`.

## `validate.mts`

Not a spec — a script, run by CI's `validate` job, because it needs a JVM and a 40 MB jar:

```
node tests/dist/validate.mjs path/to/gtfs-validator.jar
UPDATE_BASELINE=1 node tests/dist/validate.mjs path/to/gtfs-validator.jar
```

It builds all three feeds and holds each to the MobilityData validator against its own baseline,
which lives with the app that produces the feed:

| Feed | Baseline |
|---|---|
| rail | `apps/cif2gtfs/fixtures/mini/validator-baseline.json` |
| bus | `apps/transxchange2gtfs/fixtures/mini/validator-baseline.json` |
| merged | `apps/gtfsmerge/fixtures/validator-baseline.json` |

Any `ERROR` fails. Warnings and info do not — the feeds have known ones that are either out of our
hands or waiting on a ticket — but the set of them is committed with a reason for each, so a new one
fails and a fixed one has to be taken off the list. A baseline nobody prunes stops meaning anything.

The merged baseline is the one worth watching, and it caught the merged feed calling at
`location_type=1` stations on its first run: 332 errors, from the merge moving every call from a
platform onto the station above it.
