import * as fs from "node:fs";
import * as path from "node:path";
import {FeedZip} from "@gb-transit/dtd-source";
import schema from "@gb-transit/dtd-schema";

/**
 * A fares feed file: RJFAF847.ZIP is a full refresh, RJFAC848.ZIP a change file.
 *
 * Only the refresh is read. A change file amends a refresh that has already
 * been imported, and applying one to nothing produces a set of groups missing
 * everything the refresh established - which looks like a build, not an error.
 */
const FARES_REFRESH = /^RJFAF(\d+)\.zip$/i;

/**
 * One `RG` record: a fare area, valid for a date range.
 *
 * `uic` is the seven digit code - `70`, the four digit NLC, and a check digit.
 * `7014440` is Euston, whose NLC is `1444`.
 */
export interface LocationGroup {
  readonly uic: string;
  readonly description: string;
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * One `RM` record: a station in a fare area, for one of that area's date ranges.
 *
 * Keyed back to its group by `(groupUic, endDate)`, because a group with two
 * date ranges has two sets of members and they are not always the same set.
 */
export interface GroupMember {
  readonly groupUic: string;
  readonly endDate: string;
  readonly crs: string;
}

export interface FaresGroups {
  readonly groups: readonly LocationGroup[];
  readonly members: readonly GroupMember[];
}

/**
 * The station groups out of a fares feed.
 *
 * The fares feed is read here rather than through `dtd-source` on purpose. That
 * library reads `RJTT*` and only `RJTT*`, and the file and database paths have
 * to produce the same feed - so taking group membership through the shared
 * source would make the two disagree and break the byte-identity check. This
 * extension owns its own source, and the equality holds because neither path
 * has it.
 */
export function groupsFromFeed(source: string): () => Promise<FaresGroups> {
  return async () => read(faresRefresh(source));
}

/**
 * The fares refresh to read, given a file or a directory to look in.
 *
 * A directory accumulates more than one cycle, so the highest numbered refresh
 * wins rather than whichever the filesystem lists first.
 */
export function faresRefresh(source: string): string {
  if (!fs.existsSync(source)) {
    throw new Error(`No fares feed at ${source}.`);
  }

  if (!fs.statSync(source).isDirectory()) {
    if (!FARES_REFRESH.test(path.basename(source))) {
      throw new Error(
        `${source} is not a fares refresh. Expected a file named RJFAFxxx.ZIP - ` +
        `a change file amends a refresh rather than standing in for one.`
      );
    }

    return source;
  }

  const refreshes = fs.readdirSync(source)
    .filter(name => FARES_REFRESH.test(name))
    .sort((a, b) => sequence(a) - sequence(b));

  if (refreshes.length === 0) {
    throw new Error(`No fares refresh in ${source}. Expected a file named RJFAFxxx.ZIP.`);
  }

  return path.join(source, refreshes[refreshes.length - 1]);
}

function sequence(name: string): number {
  return Number(FARES_REFRESH.exec(name)![1]);
}

function text(value: unknown): string {
  return String(value).trim();
}

async function read(filename: string): Promise<FaresGroups> {
  const zip = new FeedZip(filename);
  const lines: string[] = [];

  try {
    await zip.eachLine("LOC", line => lines.push(line));
  }
  finally {
    zip.close();
  }

  return parseGroups(lines);
}

/**
 * The `RG` and `RM` records out of the lines of a LOC file.
 *
 * The rest of the file is ignored: it is mostly `RL` locations and `RR`
 * railcards, 207,000 lines of them against the 2,200 that matter here.
 */
export function parseGroups(lines: Iterable<string>): FaresGroups {
  const groups: LocationGroup[] = [];
  const members: GroupMember[] = [];
  const LOC = schema.fares.LOC;

  for (const line of lines) {
    // Not `=== null`: getRecord is typed `Record | null` but indexes a map, so
    // an unrecognised record type comes back undefined. A record type this
    // schema does not know is a line to skip, not a build to crash.
    const record = LOC.getRecord(line);

    if (!record || (record.name !== "location_group" && record.name !== "location_group_member")) {
      continue;
    }

    const {values} = record.extractValues(line);

    // Every text field is padded to its fixed width - `BEDFORD+BUS` arrives as
    // `BEDFORD+BUS     `. The padding is an artifact of the file format rather
    // than part of the value, and `area_name` is published.
    if (record.name === "location_group") {
      groups.push({
        uic: text(values.group_uic_code),
        description: text(values.description),
        startDate: text(values.start_date),
        endDate: text(values.end_date)
      });
    }
    else {
      members.push({
        groupUic: text(values.group_uic_code),
        endDate: text(values.end_date),
        crs: text(values.member_crs_code)
      });
    }
  }

  return {groups, members};
}
