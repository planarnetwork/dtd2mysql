export function showHelp(): void {
  console.log(`
gtfsmerge - merge GTFS feeds into one

Usage:
  gtfsmerge [options] <input.zip>... <output>

  Every argument but the last is a feed to merge. The last is where the merged
  feed goes: a .zip, or a directory.

Options:
  --stop-prefix <text>        Prepended to every stop id. For feeds that do not
                              share an id space - GB feeds built from this
                              repository already agree on ATCO codes and need none.
  --transfer-distance <km>    How far apart two stops may be for a walk transfer
                              to be generated between them. Default 1.6.
  --no-extra-transfers        Generate no walk transfers at all.
  --no-date-filter            Keep services that have already finished. By
                              default anything ending before today is dropped.
  --remove-route-types <list> Comma separated GTFS route types to drop, e.g. 3,4.
  --ruler-latitude <degrees>  The latitude the distance approximation is
                              calibrated at. Default 54, the middle of GB.
  --tmp <directory>           Where the files are assembled. Default a temporary
                              directory.
  --help                      This.
`);
}
