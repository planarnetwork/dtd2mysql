# @gb-transit/gtfs-loader

## 1.0.0

### Major Changes

- First release. A GTFS reader, brought over from
  [raptor](https://github.com/planarnetwork/raptor), where it had grown into a general
  purpose one that a journey planner happened to own.

  It reads a zip as the bytes arrive rather than after they have all been collected, so the
  source can be a stream, a `Response`, a `Blob` or the bytes themselves, and it works in a
  browser as well as in node. `normalise` puts the feed into the terms a planner works in;
  `linkTrips` turns a `transfer_type: 4` coupling into the through trip a passenger stays
  on, which is the same row `@gb-transit/gtfs` writes.

  Two things changed on the way over. Times are now read by `parseDuration` from
  `@gb-transit/gtfs-schema`, so a time this reads and a time the feed build writes mean the
  same thing: `"HH:MM"` is accepted where it used to silently yield `NaN`, and a string that
  cannot be read now throws instead of carrying `NaN` into a planned journey. And a
  calendar date is now indexed by number rather than by the string the feed gave, which is
  what `Service.runsOn` was always looking it up with.
