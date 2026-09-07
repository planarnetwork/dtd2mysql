# @gb-transit/gtfs-schema

## 1.0.0

### Major Changes

- Split the GTFS vocabulary out of `@gb-transit/gtfs`.

  The entity types, the row types, the three coded-column enums and the two scalar modules
  (`Duration` and `PlainDate`) now live here, in a package that depends on nothing.
  `@gb-transit/gtfs` re-exports all of them, so nothing that imported them from there needs
  to change.

  The reason is `@gb-transit/gtfs-loader`, which reads a feed in a browser. It wants to
  agree with this project about what a duration is and what a day of the week is numbered,
  and for those four declarations it would otherwise have taken proj4, a memoisation
  decorator and a calendar typed against `Temporal` — none of which it uses, and none of
  which a CommonJS-only package can be tree-shaken free of.
