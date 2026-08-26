import {
  Area,
  AreaRow,
  Attribution,
  Extension,
  ExtensionOutput,
  FeedView,
  StopAreaRow,
  extensionFile
} from "@gb-transit/gtfs";
import {FaresGroups, GroupMember, LocationGroup} from "./FaresSource";

export const STATION_GROUPS = "STATION_GROUPS";

const ATTRIBUTION: Attribution = {
  organisation: "Rail Delivery Group",
  licence: "Rail Settlement Plan data licence",
  url: "https://raildata.org.uk/",
  shareAlike: false
};

/**
 * Group stations as fare areas.
 *
 * A group station is a set of stations a ticket is valid to or from - `1072`
 * "London Terminals" covers Euston, Waterloo, King's Cross and fifteen others.
 * It is a ticketing construct, and a rider planning a journey to a London
 * Terminals ticket needs to know which stations that is.
 *
 * **The area is published under its NLC**, which is the identity the rest of
 * the rail industry uses. The fares feed gives the group a seven digit UIC -
 * `70`, the NLC, and a check digit - and the timetable feed carries the same
 * NLC in the `TI` record's `nalco`, so `7014440` here and `144400` there are
 * both Euston. Publishing the UIC instead would be publishing a fares feed
 * detail; the NLC is the thing another dataset can be joined on.
 *
 * Every kind of area in the table is emitted. It mixes true station groups with
 * travelcard zones (`LONDON ZONES 1-3`) and bus groups (`HEATHROW BUS`), and
 * all three are fare areas that a fare is genuinely expressed in terms of. The
 * source's own description is the area name, so which kind an area is stays
 * legible without this deciding.
 */
export class StationGroupsExtension implements Extension<FaresGroups> {

  public readonly key = STATION_GROUPS;
  public readonly attribution = ATTRIBUTION;

  constructor(
    private readonly source: () => Promise<FaresGroups>,
    /**
     * The date the feed is built for, `YYYY-MM-DD`.
     *
     * 58 groups have more than one date range, so without a date to select on
     * there is no single answer to what a group contains and `area_id` comes
     * out duplicated.
     */
    private readonly today: string
  ) {}

  public fetch(): Promise<FaresGroups> {
    return this.source();
  }

  public files(feed: FeedView, data: FaresGroups): ExtensionOutput {
    const current = currentGroups(data.groups, this.today);
    const members = membersOf(data.members, current);

    const areas: AreaRow[] = [];
    const stopAreas: StopAreaRow[] = [];
    const notes: string[] = [];

    let unknownStations = 0;
    let empty = 0;

    for (const [uic, group] of [...current].sort(byKey)) {
      const inFeed: StopAreaRow[] = [];

      for (const crs of members.get(uic) ?? []) {
        const station = feed.station(crs);

        if (station === undefined) {
          unknownStations++;
          continue;
        }

        inFeed.push({area_id: nlc(uic), stop_id: station.stop_id});
      }

      // An area with no members says a fare area exists and nothing about what
      // is in it, which is worse than not publishing it: a consumer cannot tell
      // an empty group from one this build failed to resolve.
      if (inFeed.length === 0) {
        empty++;
        continue;
      }

      areas.push(toAreaRow(uic, group));
      stopAreas.push(...inFeed);
    }

    if (unknownStations > 0) {
      notes.push(
        `${unknownStations} group members name a station this feed does not contain, ` +
        `so they are left out of their area`
      );
    }

    if (empty > 0) {
      notes.push(`${empty} groups have no member this feed contains, and are not published`);
    }

    return {
      files: [
        extensionFile("areas.txt", areas, row => [row.area_id]),
        extensionFile("stop_areas.txt", stopAreas, row => [row.area_id, row.stop_id])
      ],
      report: {
        extension: this.key,
        written: areas.length,
        dropped: empty,
        notes
      }
    };
  }

}

/**
 * The four digit NLC out of the seven digit UIC: `70`, the NLC, a check digit.
 */
export function nlc(uic: string): string {
  return uic.slice(2, 6);
}

function toAreaRow(uic: string, group: LocationGroup): Area {
  return {area_id: nlc(uic), area_name: group.description};
}

/**
 * One row per group: the one valid on the build date.
 *
 * 58 groups have more than one date range, usually because membership changed.
 * Taking all of them would duplicate `area_id`, and taking the first would make
 * the feed depend on the order the file happened to list them in.
 *
 * Where no range covers the date - a group that has expired, or one that starts
 * later - the group is left out entirely rather than being published with a
 * membership that is not current.
 */
export function currentGroups(
  groups: readonly LocationGroup[],
  today: string
): Map<string, LocationGroup> {
  const current = new Map<string, LocationGroup>();

  for (const group of groups) {
    if (group.startDate > today || group.endDate < today) {
      continue;
    }

    const existing = current.get(group.uic);

    // Two ranges both covering the build date is the source contradicting
    // itself. The one ending sooner is the more specific statement about today,
    // and picking on the data rather than on arrival order keeps the feed the
    // same whichever way the file was read.
    if (existing === undefined || group.endDate < existing.endDate) {
      current.set(group.uic, group);
    }
  }

  return current;
}

/**
 * The CRS codes in each selected group, deduplicated.
 *
 * Members are keyed to a group by `(group, end date)`, so a group with two date
 * ranges has two member sets and only the one belonging to the selected range
 * is read.
 */
export function membersOf(
  members: readonly GroupMember[],
  current: ReadonlyMap<string, LocationGroup>
): Map<string, Set<string>> {
  const byGroup = new Map<string, Set<string>>();

  for (const member of members) {
    const group = current.get(member.groupUic);

    if (group === undefined || group.endDate !== member.endDate) {
      continue;
    }

    const crs = byGroup.get(member.groupUic) ?? new Set<string>();

    crs.add(member.crs);
    byGroup.set(member.groupUic, crs);
  }

  return byGroup;
}

function byKey(a: [string, LocationGroup], b: [string, LocationGroup]): number {
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
}
