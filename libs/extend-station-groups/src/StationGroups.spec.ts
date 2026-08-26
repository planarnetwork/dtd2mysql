import {describe, it, expect} from "vitest";
import {MutableFeed} from "@gb-transit/gtfs";
import type {AreaRow, Stop, StopAreaRow} from "@gb-transit/gtfs";
import {StationGroupsExtension, currentGroups, membersOf, nlc} from "./StationGroups";
import {FaresGroups, GroupMember, LocationGroup} from "./FaresSource";

const FOREVER = "2999-12-31";

const stop = (crs: string): Stop => ({
  stop_id: `910G${crs}`, crs, tiploc: crs, stop_name: crs, stop_desc: "", stop_lat: 51, stop_lon: -1,
  zone_id: 0, stop_url: "", location_type: 1, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0, located: true
});

const group = (
  uic: string,
  description: string,
  startDate = "2020-01-01",
  endDate = FOREVER
): LocationGroup => ({uic, description, startDate, endDate});

const member = (groupUic: string, crs: string, endDate = FOREVER): GroupMember =>
  ({groupUic, endDate, crs});

const feed = (...crs: string[]) => new MutableFeed(crs.map(stop), [], []);

const run = (data: FaresGroups, stations: string[], today = "2026-08-26") =>
  new StationGroupsExtension(() => Promise.resolve(data), today)
    .files(feed(...stations), data);

const areas = (output: ReturnType<typeof run>) =>
  output.files.find(f => f.filename === "areas.txt")!.rows as readonly AreaRow[];

const stopAreas = (output: ReturnType<typeof run>) =>
  output.files.find(f => f.filename === "stop_areas.txt")!.rows as readonly StopAreaRow[];

describe("nlc", () => {

  // 70 + NLC + check digit. The NLC is the identity the rest of the industry
  // uses, and the one the timetable feed's TI record carries as `nalco`.
  it("takes the NLC out of the UIC", () => {
    expect(nlc("7014440")).to.equal("1444");
    expect(nlc("7055980")).to.equal("5598");
    expect(nlc("7010720")).to.equal("1072");
  });

});

describe("StationGroupsExtension", () => {

  it("publishes a group as an area, under its NLC", () => {
    const output = run(
      {groups: [group("7010720", "LONDON TERMINALS")], members: [member("7010720", "EUS"), member("7010720", "WAT")]},
      ["EUS", "WAT"]
    );

    expect(areas(output)).to.deep.equal([{area_id: "1072", area_name: "LONDON TERMINALS"}]);
    expect(stopAreas(output)).to.deep.equal([
      {area_id: "1072", stop_id: "910GEUS"},
      {area_id: "1072", stop_id: "910GWAT"}
    ]);
  });

  // The table mixes true station groups with travelcard zones and bus groups.
  // All three are areas a fare is genuinely expressed in, so filtering by kind
  // would be this deciding which fares are real.
  it("publishes travelcard zones and bus groups as well as station groups", () => {
    const output = run(
      {
        groups: [
          group("7000320", "LONDON ZONES 1-2"),
          group("7010720", "LONDON TERMINALS"),
          group("7099990", "HEATHROW BUS")
        ],
        members: [member("7000320", "EUS"), member("7010720", "WAT"), member("7099990", "PAD")]
      },
      ["EUS", "WAT", "PAD"]
    );

    expect(areas(output).map(a => a.area_name)).to.deep.equal([
      "LONDON ZONES 1-2", "LONDON TERMINALS", "HEATHROW BUS"
    ]);
  });

  it("leaves out a member this feed does not contain, and counts it", () => {
    const output = run(
      {
        groups: [group("7010720", "LONDON TERMINALS")],
        members: [member("7010720", "EUS"), member("7010720", "ZZZ")]
      },
      ["EUS"]
    );

    expect(stopAreas(output)).to.deep.equal([{area_id: "1072", stop_id: "910GEUS"}]);
    expect(output.report.notes).to.deep.equal([
      "1 group members name a station this feed does not contain, so they are left out of their area"
    ]);
  });

  // An area with no members says a fare area exists and nothing about what is
  // in it, which a consumer cannot tell from one this build failed to resolve.
  it("does not publish a group with no member in this feed", () => {
    const output = run(
      {groups: [group("7010720", "LONDON TERMINALS")], members: [member("7010720", "ZZZ")]},
      ["EUS"]
    );

    expect(areas(output)).to.deep.equal([]);
    expect(output.report.dropped).to.equal(1);
    expect(output.report.notes).to.contain(
      "1 groups have no member this feed contains, and are not published"
    );
  });

  it("reports what it wrote", () => {
    const output = run(
      {
        groups: [group("7010720", "LONDON TERMINALS"), group("7000320", "LONDON ZONES 1-2")],
        members: [member("7010720", "EUS"), member("7000320", "WAT")]
      },
      ["EUS", "WAT"]
    );

    expect(output.report.extension).to.equal("STATION_GROUPS");
    expect(output.report.written).to.equal(2);
    expect(output.report.dropped).to.equal(0);
  });

  it("writes both files even when there is nothing to put in them", () => {
    const output = run({groups: [], members: []}, ["EUS"]);

    expect(output.files.map(f => f.filename)).to.deep.equal(["areas.txt", "stop_areas.txt"]);
  });

  // The same station in two groups is the normal case: Euston is in London
  // Terminals and in a travelcard zone, and neither contains the other.
  it("lets a station belong to more than one area", () => {
    const output = run(
      {
        groups: [group("7010720", "LONDON TERMINALS"), group("7000320", "LONDON ZONES 1-2")],
        members: [member("7010720", "EUS"), member("7000320", "EUS")]
      },
      ["EUS"]
    );

    expect(stopAreas(output)).to.deep.equal([
      {area_id: "0032", stop_id: "910GEUS"},
      {area_id: "1072", stop_id: "910GEUS"}
    ]);
  });

  // The source lists the same station twice in one group in a handful of cases.
  it("does not repeat a station listed twice in one group", () => {
    const output = run(
      {
        groups: [group("7010720", "LONDON TERMINALS")],
        members: [member("7010720", "EUS"), member("7010720", "EUS")]
      },
      ["EUS"]
    );

    expect(stopAreas(output)).to.deep.equal([{area_id: "1072", stop_id: "910GEUS"}]);
  });

});

describe("currentGroups", () => {

  // 58 groups have more than one date range. Taking all of them duplicates
  // area_id; taking the first makes the feed depend on the order the file
  // happened to list them in.
  it("takes the range that covers the build date", () => {
    const groups = [
      group("7010720", "OLD MEMBERSHIP", "2020-01-01", "2026-01-01"),
      group("7010720", "NEW MEMBERSHIP", "2026-01-02", FOREVER)
    ];

    expect(currentGroups(groups, "2026-08-26").get("7010720")?.description).to.equal("NEW MEMBERSHIP");
    expect(currentGroups(groups, "2025-06-01").get("7010720")?.description).to.equal("OLD MEMBERSHIP");
  });

  it("is the same whichever order the ranges are read in", () => {
    const a = group("7010720", "OLD", "2020-01-01", "2026-01-01");
    const b = group("7010720", "NEW", "2026-01-02", FOREVER);

    expect(currentGroups([a, b], "2026-08-26")).to.deep.equal(currentGroups([b, a], "2026-08-26"));
  });

  it("leaves out a group whose ranges do not cover the build date", () => {
    const expired = [group("7010720", "GONE", "2020-01-01", "2021-01-01")];
    const future = [group("7010720", "NOT YET", "2030-01-01", FOREVER)];

    expect(currentGroups(expired, "2026-08-26").size).to.equal(0);
    expect(currentGroups(future, "2026-08-26").size).to.equal(0);
  });

  it("includes a range that starts or ends exactly on the build date", () => {
    expect(currentGroups([group("7010720", "X", "2026-08-26", FOREVER)], "2026-08-26").size).to.equal(1);
    expect(currentGroups([group("7010720", "X", "2020-01-01", "2026-08-26")], "2026-08-26").size).to.equal(1);
  });

  // Two ranges both covering the date is the source contradicting itself. The
  // one ending sooner is the more specific statement about today.
  it("takes the range ending soonest when two both cover the date", () => {
    const groups = [
      group("7010720", "OPEN ENDED", "2020-01-01", FOREVER),
      group("7010720", "SPECIFIC", "2020-01-01", "2027-01-01")
    ];

    expect(currentGroups(groups, "2026-08-26").get("7010720")?.description).to.equal("SPECIFIC");
  });

});

describe("membersOf", () => {

  // Members are keyed to a group by (group, end date), so a group with two
  // ranges has two member sets and only one of them is current.
  it("takes only the members of the selected date range", () => {
    const current = currentGroups(
      [
        group("7010720", "OLD", "2020-01-01", "2026-01-01"),
        group("7010720", "NEW", "2026-01-02", FOREVER)
      ],
      "2026-08-26"
    );
    const members = membersOf(
      [
        member("7010720", "EUS", "2026-01-01"),
        member("7010720", "WAT", FOREVER),
        member("7010720", "KGX", FOREVER)
      ],
      current
    );

    expect([...members.get("7010720")!].sort()).to.deep.equal(["KGX", "WAT"]);
  });

  it("ignores members of a group that is not current", () => {
    expect(membersOf([member("7010720", "EUS")], new Map()).size).to.equal(0);
  });

});
