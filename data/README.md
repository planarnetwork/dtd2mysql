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

## Fingerprinting

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
