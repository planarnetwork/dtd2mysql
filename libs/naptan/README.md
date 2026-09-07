# @gb-transit/naptan

Download, cache and read NaPTAN: the DfT's dataset of every public transport access point in Great
Britain.

```
npm install @gb-transit/naptan
```

Both a rail feed and a bus feed need it to say where a stop actually is, and reading it needs
nothing but a CSV parser — so this package depends on nothing else, and a bus converter does not
inherit a rail transit model to get a coordinate.

## Usage

```ts
import {naptanCsv, parseNaptanRows} from "@gb-transit/naptan";

// Cached on disk. The national file is around 100MB and NaPTAN changes slowly,
// so a nightly that fails because the DfT is briefly down has failed for nothing.
const csv = await naptanCsv("/tmp/naptan-cache")();

for (const row of parseNaptanRows(csv, row => row.StopType === "BCT")) {
  console.log(row.ATCOCode, row.CommonName, row.Latitude, row.Longitude);
}
```

Rows come back **by column name**, not narrowed to a fixed set of fields: NaPTAN has around forty
columns, different consumers want different ones, and the file gains columns between releases.
Reading by name is the point — the alternative, which the TransXChange conversion used to do, was
to slice out positions `[0,1,4,10,14,18,19,29,30]` and hope the DfT never reordered anything.

What each consumer does with a row differs enough that it belongs with the consumer:
[`@gb-transit/enrich-naptan`](../enrich-naptan) reduces the rail records to a coordinate per TIPLOC,
[`transxchange2gtfs`](../../apps/transxchange2gtfs) indexes every stop a TransXChange document
references.
