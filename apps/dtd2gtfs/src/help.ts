export async function showHelp(argv: string[]): Promise<void> {
  console.log(`
Usage: dtd2gtfs build [OPTIONS]
Build a GTFS feed from the DTD timetable feed, with no database

  --source FILE              a DTD timetable zip. Repeat it to apply a full
                             refresh and then its incrementals, in order
  --out PATH                 where to write. A path ending .zip produces a zip,
                             anything else a directory of text files
                             (defaults to ./gtfs.zip)
  --range RANGE              how far ahead to build, e.g. "3 months"
                             (defaults to '3 MONTH')
  --today YYYY-MM-DD         the date to build for (defaults to the current date)

For example:

  dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip --range "6 months"

The same GTFS_RANGE and GTFS_TODAY environment variables dtd2mysql reads are
honoured, and --range and --today override them.
`);
}
