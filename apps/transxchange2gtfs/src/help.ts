export function showHelp(): void {
  console.log(`
transxchange2gtfs - convert TransXChange data to GTFS

Usage:
  transxchange2gtfs [options] <input.xml|input.zip>... <output>

  Every argument but the last is a TransXChange file, or a zip of them. A zip
  containing zips is read too, which is the shape a BODS download arrives in.
  The last argument is where the feed goes: a .zip, or a directory.

Options:
  --naptan <file>    Read NaPTAN stop data from this CSV instead of downloading
                     it. The national file is around 100MB.
  --update-stops     Re-download NaPTAN even if the cached copy is current.
  --skip-stops       Write no stops.txt or transfers.txt, and download nothing.
  --help             This.

Environment:
  AGENCY_URL, AGENCY_TIMEZONE, AGENCY_LANG   Written into agency.txt, which
                     TransXChange gives no values for.
`);
}
