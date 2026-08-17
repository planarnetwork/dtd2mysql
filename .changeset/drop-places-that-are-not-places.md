---
"dtd2mysql": minor
---

Stop the feed containing places that do not exist.

- **Twelve operator placeholders are gone.** `CH ORIGIN`, `XC DESTINATION` and
  the rest are in the MSN so a schedule has somewhere to start and end when the
  real terminus is not known. They were stops in the North Sea, and 18 trips
  called at them. Every one of those trips had two stops and both were
  placeholders, so the trips go too. Both counts are logged.
- **Tottenham Court Road is no longer in the Indian Ocean.** Its override entry
  had the latitude and longitude the wrong way round. All 2,594 entries are
  checked against the bounds of the feed now, so the next transposition fails a
  test rather than shipping.
- **43 Irish stations are no longer in the South Atlantic.** Their easting and
  northing are all zeroes, which is the feed saying it has no coordinate rather
  than a coordinate of zero. No train in the feed calls at any of them, so they
  are left out until a source can locate them, instead of being published at a
  made-up point. Two Blackpool bus-tram stops that fixed links do reference are
  published at 0,0 and named in a warning.
