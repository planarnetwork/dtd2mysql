export async function showHelp(argv: string[]): Promise<void> {
  console.log(`
Usage: dtd2gtfs build [OPTIONS]
Build a GTFS feed from the DTD timetable feed, with no database

  --source PATH              a DTD timetable zip, or a directory of them. A
                             directory contributes every RJTTxxxx.ZIP it holds,
                             in sequence order, from the most recent full
                             refresh onwards. Repeat it to combine sources
  --out PATH                 where to write. A path ending .zip produces a zip,
                             anything else a directory of text files
                             (defaults to ./gtfs.zip)
  --range RANGE              how far ahead to build, e.g. "3 months"
                             (defaults to '3 MONTH')
  --today YYYY-MM-DD         the date to build for (defaults to the current date)
  --links                    also write links.txt, this project's own file of
                             fixed links. transfers.txt holds the same links;
                             links.txt is kept for one release

For example:

  dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip --range "6 months"
  dtd2gtfs build --source ./feeds --out gtfs.zip

The same GTFS_RANGE and GTFS_TODAY environment variables dtd2mysql reads are
honoured, and --range and --today override them.
`);
}
