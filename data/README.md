# Reference data

The feeds themselves are **not** committed. They are large, current and perishable, and a copy in
git would be wrong within a fortnight. What is committed is everything needed to reproduce a
baseline: the scripts that fetch and fingerprint, and the fingerprints.

```
data/feeds/            the four DTD feeds          gitignored
data/snapshots/db-*    table fingerprints          tracked
data/snapshots/gtfs-*  a built feed and its hashes gitignored, it keeps the payload
```

## Getting the feeds

Credentials come from a Rail Data Marketplace subscription — `raildata.org.uk`, not the National
Rail open data portal, which was retired in early 2026. Put them in `.env.local`, which is
gitignored:

```
SFTP_USERNAME=...
SFTP_PASSWORD=...
```

```
data/download.sh --download-timetable
data/download.sh --download-fares
data/download.sh --download-routeing
data/download.sh --download-nfm64
```

## Rail Data Marketplace

`rdm-download.sh` pulls the files behind a data product. It needs a Bearer token copied out of the
browser, because RDM's portal client requires an interactive authorization code flow - there is no
password grant to script, and the token endpoint says so:
`Unsupported Client Authentication Method!`.

```
RDM_TOKEN=... data/rdm-download.sh P-<product> DSP-<dataset> NLC data/rdm
```

The token lasts an hour. `rdm-token.mjs` is a start at getting one without devtools, by driving the
login page - **it does not work yet**, and says so at the top of the file along with what is known
about the flow. There is no machine credential to use instead: the token endpoint answers
`Unsupported Client Authentication Method!` to anything but an interactive authorization code flow.

The other durable path is the product's own cloud delivery, which pushes files to a bucket you own
on a schedule and needs nobody logged in.

**The location mapping needs none of this.** The MCA file's `TI` records already carry TIPLOC, NLC,
STANOX and CRS for 12,047 locations, which is the same dataset RDM ships as weekly NLC snapshots and
agrees with it on every station checked. RDM is for the products that are genuinely not in the DTD
feed - accessibility, vehicle data - not for locations.

The prefix is required rather than optional. A product holds more than one family of file - the
location product carries 118 NLC snapshots and 3 passenger-consist logs - and they are dated
independently, so the newest file overall is rarely the newest of the family you wanted.

## Fingerprinting

**The dump tool is part of the baseline.** A fingerprint is a hash of `mariadb-dump` output, so
`mysqldump` is not a substitute - it formats rows differently and queries a table MariaDB does not
have. The script refuses to run without it. A `mariadb-dump` *version* change can also move a hash
without any data changing; that is a rebaseline under T8 like any other, and the diff will show it
as every table at once, which is the tell.

**So a fingerprint is only comparable within one environment.** A baseline cut here will not match
one cut on a GitHub runner even with identical data - tried it, and every table hash differed while
every row count matched, which is the signature. That is why `verify-import.sh` is run on demand
against the reference feeds rather than on every pull request: the per-PR job proves the import
works by building the feed two ways and diffing, which needs no baseline at all.

Baselines here were cut with:

```
mariadb-dump from 11.8.6-MariaDB, client 10.19 for debian-linux-gnu (x86_64)
```

`snapshot-db.sh` writes three files per snapshot: the schema DDL with the dump date stripped, a row
count and content hash per table, and the column list. Every hash is taken over rows ordered by
primary key, so it is stable regardless of storage order — that is the property the whole harness
rests on, and it is worth re-checking if a baseline ever flaps.

```
data/snapshot-db.sh data/snapshots/db-<name>
GTFS_TODAY=2026-08-10 data/snapshot-gtfs.sh data/snapshots/gtfs-<name>
```

## What each baseline was cut from

| snapshot | feeds | notes |
|---|---|---|
| `db-RJTTF918-C920` | `RJTTF918` then `RJTTC920` | a refresh and one incremental |
| `db-all-feeds` | timetable, fares, routeing, nfm64 | all four, 80 tables |

Both predate B22, which changed how generated ids are assigned during import, so they capture the
behaviour that dropped an incremental's stop times. They are the *before* side of that fix. Rebase
them under T8 with the diff as the evidence, and say so in `apps/dtd2gtfs/fixtures/BASELINE.md`.
