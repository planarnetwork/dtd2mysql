---
"@gb-transit/gtfs": patch
---

Put Bond Street back in Mayfair.

Bond Street and both of its Elizabeth line platforms were published 21km east, in Dagenham. The
override in `station-coordinates.ts` read `"stop_lon": 0.15`, which is the "51.514°N 0.15°W" of the
station's Wikipedia infobox copied without the W. Canary Wharf had the same injury from the same
source and was published 2.5km out, in the river off Blackwall. Both signs are now negative.

Neither station could be rescued by anything downstream. NaPTAN ships its rail records for both with
the position left blank, so they are two of the fourteen stations still relying on the override
file, and the bounds check cannot see a London longitude with its sign lost — it is comfortably
inside Great Britain.

The DTD can. Its own grid reference put Bond Street on Davies Street all along, and `toStop`
discarded it for the override without ever comparing the two. It now does: where an override and the
grid reference disagree by more than 5km, the DTD's position is kept and the station is named on
stderr, while the name and the accessibility the override also carries still apply. 5km is chosen to
sit above every honest disagreement — the grid reference is rounded to 100m and Birmingham New
Street's is 1.3km from the platforms, with the override in the right — and the largest across all
2,764 stations both sources describe is 3.3km. A station the DTD could not locate at all has only
the override, so it is taken as given.
