---
"@gb-transit/gtfs-schema": minor
"@gb-transit/dtd-source": minor
"@gb-transit/gtfs": minor
"dtd2mysql": minor
"@gb-transit/gtfs-loader": patch
"@gb-transit/gtfs-output": patch
"@gb-transit/naptan": patch
"transxchange2gtfs": patch
"gtfsmerge": patch
"cif2gtfs": patch
---

Lower the engine floor from Node 26 to Node 22, with Temporal from `temporal-polyfill`.

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
