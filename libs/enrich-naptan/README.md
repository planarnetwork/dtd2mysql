# @gb-transit/enrich-naptan

Station coordinates and names from NaPTAN.

```
npm install @gb-transit/enrich-naptan
```

An `Enricher` for [`@gb-transit/gtfs`](https://www.npmjs.com/package/@gb-transit/gtfs). The DTD
timetable carries station positions as rounded grid references, which is enough to say roughly where
a station is and not enough to put it on a map. NaPTAN is the Department for Transport's register of
public transport access points, surveyed and far more precise, and this fills in coordinates — and
optionally readable names — from it.

## Usage

```ts
import {NAPTAN, NaptanEnricher, naptanFromApi} from "@gb-transit/enrich-naptan";
import {BuildFeed} from "@gb-transit/gtfs";

const feed = new BuildFeed(source, output, context, [
  new NaptanEnricher(naptanFromApi("/tmp/naptan-cache"))
]);
```

`naptanFromApi(cacheDir)` downloads the dataset and caches it. `parseNaptan` takes the XML directly
if you would rather supply the file yourself.

The constructor's remaining arguments are the priority the enricher writes at (50 by default),
whether to accept a coordinate from a record NaPTAN has marked inactive, and whether to take station
names as well as positions:

```ts
new NaptanEnricher(naptanFromApi(cache), 50, true, false)
```

Inactive records are included by default: 14 of the matches are marked inactive, and a closed
station's surveyed position is still better than a rounded grid reference. Names are off by default,
because the DTD's names are the ones the industry uses.

## What it writes, and what it records

Every write carries this enricher's key and priority. Where two sources set the same field the
higher priority wins and the loser is kept, so `provenance.json` can say which source a coordinate
came from and what it displaced. The `EnrichmentReport` returned from a run gives the matched,
unmatched and conflict counts — the number to watch if NaPTAN changes shape upstream.

Attribution is declared by the enricher and published in the feed's `attributions.txt`. NaPTAN is
Open Government Licence.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/enrich-naptan`
in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
