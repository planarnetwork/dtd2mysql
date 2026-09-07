/**
 * The four command line tools this repository publishes to npm.
 *
 * One place, because the tools index, the navigation between tool pages and the
 * npm links all need the same list, and a fifth tool should be one entry rather
 * than four edits.
 */
export interface Tool {
  /** The npm package name, which is also the last segment of its URL here. */
  name: string;
  tagline: string;
  summary: string;
  /** The workspace it lives in, for the link to its source. */
  workspace: string;
}

export const TOOLS: Tool[] = [
  {
    name: "cif2gtfs",
    tagline: "CIF to GTFS",
    summary: "Builds the published feed straight from the DTD timetable files. One command, " +
      "no server, and the same input always produces the same bytes.",
    workspace: "apps/cif2gtfs"
  },
  {
    name: "dtd2mysql",
    tagline: "DTD to SQL",
    summary: "Imports the fares, routeing guide and timetable feeds into MySQL or MariaDB, " +
      "downloads them from the DTD server, and converts the timetable to GTFS.",
    workspace: "apps/dtd2mysql"
  },
  {
    name: "transxchange2gtfs",
    tagline: "Bus to GTFS",
    summary: "Converts TransXChange, the format GB bus and coach timetables are published in, " +
      "with NaPTAN stop names and coordinates built in.",
    workspace: "apps/transxchange2gtfs"
  },
  {
    name: "gtfsmerge",
    tagline: "Feeds into one",
    summary: "Merges GTFS feeds, re-indexing every identifier and generating transfers between " +
      "stops close enough to walk between.",
    workspace: "apps/gtfsmerge"
  }
];
