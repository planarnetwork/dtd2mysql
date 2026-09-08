export function showHelp(): void {
  console.log(`
transfer-patterns - build the transfer pattern file a journey planner reads

  transfer-patterns plan <gtfs.zip> --out <shard.br> [options]
  transfer-patterns merge <shard.br>... --out <transfer-patterns.br>

plan finds every transfer pattern in a feed and writes them sorted, de-duplicated
and brotli compressed. merge folds the shards of a run into one such file.

plan options:
  --out <file>       Where to write the patterns. Required.
  --dates <list>     Comma separated YYYY-MM-DD. Defaults to the next Tuesday,
                     Friday, Saturday and Sunday - one of each shape of day.
  --shard <n>/<of>   Plan only this shard's share of the stations. Default 1/1.
  --workers <n>      Threads to scan on. Defaults to two fewer than the cores.
  --tmp <dir>        Where the workers' files go. Defaults to a temp directory,
                     which is removed afterwards.

merge options:
  --out <file>       Where to write the patterns. Required.
  --meta <file>      Also write what the file holds, as JSON.

A pattern names the stations a journey calls at, three characters each, so the
feed has to give every station a three character stop_code - a CRS code, which
is what the GB rail feeds use.

  transfer-patterns plan gtfs.zip --out patterns.br
  transfer-patterns plan gtfs.zip --shard 2/6 --workers 4 --out shard-2.br
  transfer-patterns merge shard-*.br --out transfer-patterns.br
`);
}
