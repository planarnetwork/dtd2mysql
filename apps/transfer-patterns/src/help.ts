export function showHelp(): void {
  console.log(`
transfer-patterns - build the transfer pattern file a journey planner reads

  transfer-patterns plan <gtfs.zip> --out <shard.gz> [options]
  transfer-patterns merge <shard.gz>... --out <transfer-patterns.gz>
  transfer-patterns split <transfer-patterns.gz> --out <dir>

plan finds every transfer pattern in a feed and writes them sorted, de-duplicated
and brotli compressed. merge folds the shards of a run into one such file.

plan options:
  --out <file>       Where to write the patterns. Required.
  --dates <list>     Comma separated YYYY-MM-DD. Defaults to the week beginning
                     today, which covers every shape of day.
  --shard <n>/<of>   Plan only this shard's share of the stations. Default 1/1.
  --workers <n>      Threads to scan on. Defaults to two fewer than the cores.
  --tmp <dir>        Where the workers' files go. Defaults to a temp directory,
                     which is removed afterwards.

split writes one file per station, named for it, so a planner can read the
patterns for a journey without reading the rest of the network.

split options:
  --out <dir>        Where the per station files go. Required.
  --extension <ext>  What each file is called after its code, and so what it is
                     compressed with: .gz is gzip, anything else brotli.
                     Defaults to .gz, which is what a browser can read.

A file ending .gz is gzip and anything else is brotli. Brotli is smaller; gzip
is the one a browser can decompress.

merge options:
  --out <file>       Where to write the patterns. Required.
  --shards <n>       How many shards to expect. A merge short of one is missing
                     that share of the network and reads no differently for it.
  --meta <file>      Also write what the file holds, as JSON.

A pattern names the stations a journey calls at, three characters each, so the
feed has to give every station a three character stop_code - a CRS code, which
is what the GB rail feeds use.

  transfer-patterns plan gtfs.zip --out patterns.gz
  transfer-patterns plan gtfs.zip --shard 2/6 --workers 4 --out shard-2.gz
  transfer-patterns merge shard-*.gz --out transfer-patterns.gz
`);
}
