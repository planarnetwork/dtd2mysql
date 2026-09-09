export function showHelp(): void {
  console.log(`
gtfsmerge - merge GTFS feeds into one

Usage:
  gtfsmerge [options] <input.zip>... <output>

  Every argument but the last is a feed to merge. The last is where the merged
  feed goes: a .zip, or a directory.

Options:
  --transfer-distance <km>    How far apart two stops may be for a walk transfer
                              to be generated between them. Default 1.6.
  --no-extra-transfers        Generate no walk transfers at all.
  --no-date-filter            Keep services that have already finished. By
                              default anything ending before today is dropped.
  --date-filter <YYYYMMDD>    Drop anything that finished before this date
                              rather than before today. For a reproducible
                              merge, which is what the tests want.
  --remove-route-types <list> Comma separated GTFS route types to drop, e.g. 3,4.
  --no-shapes                 Leave out shapes.txt and the shape_id naming it. A
                              shape is the line drawn on a map and nothing a
                              journey planner reads, and it is half of a national
                              bus feed.
  --ruler-latitude <degrees>  The latitude the distance approximation is
                              calibrated at. Default 54, the middle of GB.
  --tmp <directory>           Where the files are assembled. Default a temporary
                              directory.
  --help                      This.
`);
}
