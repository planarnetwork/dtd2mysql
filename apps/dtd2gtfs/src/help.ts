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
  --config PATH              read the build from a YAML file. Any flag given as
                             well takes precedence, so a config is a starting
                             point rather than a commitment
  --links                    also write links.txt, this project's own file of
                             fixed links. transfers.txt holds the same links;
                             links.txt is kept for one release
  --duplicate-overnight-associations
                             duplicate associated schedules which runs on the
                             next day to have a copy which runs on the same
                             service day as the base schedule

For example:

  dtd2gtfs build --source RJTTF918.ZIP --out gtfs.zip --range "6 months"
  dtd2gtfs build --source ./feeds --out gtfs.zip
  dtd2gtfs build --config gtfs.config.yaml

A config file looks like this. Only source is required:

  source:
    - ./feeds/RJTTF918.ZIP
  out: gtfs.zip
  today: 2026-08-10
  range: 3 months
  licence: permissive        # or full, which allows share-alike sources
  links: false
  duplicateOvernightAssociations: true
  enrichers:
    NAPTAN:                  # on, with its own defaults
    KNOWLEDGEBASE:
      priority: 80           # outrank another source for a contested field
      apply: [wheelchair_boarding]   # and only take this from it
      options:
        cache: ./cache

The same GTFS_RANGE and GTFS_TODAY environment variables dtd2mysql reads are
honoured, and --range and --today override them.
`);
}
