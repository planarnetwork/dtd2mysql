# dtd2gtfs

Build a GTFS feed from the British rail DTD timetable feed. No database, one command.

```
dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip
```

Not published yet. From a clone:

```
yarn workspace dtd2gtfs run start build --source RJTTF918.ZIP --out gtfs.zip
```

## Requirements

Node.js 26 or later. Date handling uses the built-in `Temporal` API, which is only available as a
global from Node 26 onwards.

## Usage

```
dtd2gtfs build [OPTIONS]

  --source PATH        a DTD timetable zip, or a directory of them. Repeat it to
                       combine sources
  --out PATH           where to write. A path ending .zip produces a zip, anything
                       else a directory of text files (defaults to ./gtfs.zip)
  --range RANGE        how far ahead to build, e.g. "3 months" (defaults to '3 MONTH')
  --today YYYY-MM-DD   the date to build for (defaults to the current date)
```

The DTD feed is published as a weekly full refresh followed by daily incrementals. Pass them in the
order they were published and the result is the same as importing them in that order:

```
dtd2gtfs build \
  --source RJTTF918.ZIP \
  --source RJTTC919.ZIP \
  --source RJTTC920.ZIP \
  --out gtfs.zip --range "6 months"
```

Or point it at the directory you download into and let it work that out:

```
dtd2gtfs build --source ./feeds --out gtfs.zip --range "6 months"
```

A directory contributes every `RJTTFxxx.ZIP` and `RJTTCxxx.ZIP` it holds, ordered by sequence
number and starting at the most recent full refresh — anything before that refresh is superseded
by it. The fares, routeing and NFM64 feeds are ignored, so a directory holding all four is fine.

Note that this is not the same as sorting by filename: as text every `RJTTC` sorts before every
`RJTTF`, which would put the refresh after the incrementals that amend it.

`--today` exists so a build can be reproduced. Without it the feed is a function of the day it ran
and cannot be compared to yesterday's.

`GTFS_RANGE` and `GTFS_TODAY` are read as well, for compatibility with `dtd2mysql`; `--range` and
`--today` override them.

## Getting the feed

The timetable feed comes from the DTD SFTP server. `dtd2mysql --download-timetable` will fetch it,
or take it from wherever you already keep it.

## What it produces

`agency.txt`, `stops.txt`, `transfers.txt`, `links.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`,
`calendar.txt` and `calendar_dates.txt`. Output matches what `dtd2mysql --gtfs` produces from the
same feed files.

Building three months of the whole GB network takes around 45 seconds and 5 GB of memory.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is
`apps/dtd2gtfs` in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
