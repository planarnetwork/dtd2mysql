import {describe, it, expect} from "vitest";
import {openCalls, openFeed} from "../model/OpenFeed.js";
import {Calendars} from "../model/Calendar.js";
import {Links} from "../model/Links.js";
import {CHECKS, checkOf} from "../checks/checks.js";
import {runCheck} from "../checks/Check.js";
import type {CheckContext, Finding} from "../checks/Check.js";
import {boardAt, routeDetail, serviceDetail, stopDetail, tripDetail} from "../worker/Details.js";
import {tableOf} from "../query/Table.js";
import {run} from "../query/Filter.js";
import {brokenFeed, goldenFeed} from "./golden.js";

/**
 * The whole thing, end to end, over the feed cif2gtfs is held to.
 *
 * The units are tested beside their sources. This is the test that the pieces fit: a zip goes in and
 * a station, a train, a board and a set of findings come out, over a feed that already carries every
 * shape the explorer has to handle.
 */

async function open(bytes: Uint8Array): Promise<CheckContext> {
  const feed = await openCalls(await openFeed("golden.zip", bytes), bytes);

  return {
    feed,
    calendars: new Calendars(feed.files.get("calendar.txt"), feed.files.get("calendar_dates.txt")),
    links: new Links(feed.files.get("transfers.txt"))
  };
}

function findings(context: CheckContext, id: string): Finding[] {
  const found: Finding[] = [];
  const check = checkOf(id);

  if (check === undefined) {
    throw new Error(`No check called ${id}. Ids are in URLs, so this one was renamed.`);
  }

  runCheck(check, context, finding => found.push(finding));

  return found;
}

const loaded = await open(goldenFeed());

describe("opening a feed", () => {

  it("reads it whole", () => {
    expect(loaded.feed.files.get("stops.txt")?.rows).to.equal(345);
    expect(loaded.feed.calls?.rows).to.equal(1326);
    expect(loaded.calendars.ids.length).to.equal(59);
    expect(loaded.links.size).to.equal(56);
  });

});

describe("the checks over a feed known to be sound", () => {

  it("runs every one of them", () => {
    const skipped = CHECKS
      .map(check => runCheck(check, loaded, () => undefined))
      .filter(result => result.status === "skipped");

    expect(skipped, `skipped: ${skipped.map(s => `${s.check} (${s.why})`).join(", ")}`)
      .to.deep.equal([]);
  });

  it("finds nothing wrong with its integrity", () => {
    for (const id of ["calls-name-a-trip", "calls-name-a-stop", "trips-have-a-calendar",
      "ids-are-unique", "boarding-points-have-a-station", "transfers-name-real-things"]) {
      expect(findings(loaded, id), id).to.deep.equal([]);
    }
  });

  it("finds nothing wrong with its geography or its times", () => {
    for (const id of ["stops-are-located", "stops-are-in-gb", "platforms-are-at-their-station",
      "time-runs-forwards", "sequences-are-whole", "trips-go-somewhere"]) {
      expect(findings(loaded, id).map(finding => finding.message), id).to.deep.equal([]);
    }
  });

  it("finds the two calendars the fixture has that nothing uses", () => {
    // A real expected value from committed data, which is worth more than a hand-built one: it is
    // the check being right about a feed nobody wrote to make it right.
    const found = findings(loaded, "calendars-have-trips");

    expect(found.length).to.equal(2);
    expect(found.map(finding => finding.ref)).to.deep.equal([
      {kind: "service", id: "1"},
      {kind: "service", id: "2"}
    ]);
  });

  it("notes the times past midnight rather than calling them a fault", () => {
    const found = findings(loaded, "times-past-midnight");

    expect(found.length).to.equal(1);
    expect(found[0].severity).to.equal("note");
    expect(found[0].message).to.contain("previous day's service");
  });

});

describe("the checks over a feed broken on purpose", () => {

  it("catches a call on a trip that does not exist", async () => {
    const broken = await open(brokenFeed({
      "stop_times.txt": text => `${text.trimEnd()}\nNO_SUCH_TRIP,10:00:00,10:00:00,9100ABRDEEN3,1,,0,0,,1\n`
    }));

    expect(findings(broken, "calls-name-a-trip").map(finding => finding.message))
      .to.deep.equal(["stop_times.txt calls on trip NO_SUCH_TRIP, which trips.txt does not have."]);
  });

  it("catches a call at a stop that does not exist", async () => {
    const broken = await open(brokenFeed({
      "stop_times.txt": text => text.replace("9100ABRDEEN3", "NO_SUCH_STOP")
    }));

    expect(findings(broken, "calls-name-a-stop").length).to.be.greaterThan(0);
  });

  it("catches a stop published in the Atlantic", async () => {
    const broken = await open(brokenFeed({
      "stops.txt": text => text.replace("-2.097480496,57.14304825", "0,0")
    }));

    const found = findings(broken, "stops-are-located");

    expect(found.length).to.equal(1);
    expect(found[0].message).to.contain("0,0");
    expect(found[0].ref).to.deep.equal({kind: "stop", id: "9100ABRDEEN3"});
  });

  it("catches a boarding point that has drifted from its station", async () => {
    // The enrichment-ordering artefact: a platform keeps the coordinate it had while its station
    // gets a better one. Silent on the published feed, which is what a good check looks like.
    const broken = await open(brokenFeed({
      "stops.txt": text => text.replace("-2.097480496,57.14304825", "-2.11,57.16")
    }));

    const found = findings(broken, "platforms-are-at-their-station");

    expect(found.length).to.equal(1);
    expect(found[0].message).to.match(/is [\d,]+ metres from/);
  });

  it("catches a train arriving before it left", async () => {
    const broken = await open(brokenFeed({
      "stop_times.txt": text => text.split("\n").map((line, index) =>
        index === 2 ? line.replace(/,\d\d:\d\d:\d\d,/, ",00:01:00,") : line).join("\n")
    }));

    expect(findings(broken, "time-runs-forwards").length).to.be.greaterThan(0);
  });

  it("catches a trip whose service no calendar describes", async () => {
    // Service 10, which trips really are on. Removing one of the two nothing uses would prove
    // nothing, and did until this test said which service it meant.
    const broken = await open(brokenFeed({
      "calendar.txt": text => text.split("\n").filter(line => !line.startsWith("10,")).join("\n"),
      "calendar_dates.txt": text => text.split("\n").filter(line => !line.startsWith("10,")).join("\n")
    }));

    const found = findings(broken, "trips-have-a-calendar");

    expect(found.length).to.be.greaterThan(0);
    expect(found[0].message).to.contain("It will never run.");
  });

  it("catches a calendar that ends before it starts", async () => {
    const broken = await open(brokenFeed({
      "calendar.txt": text => text.replace("1,0,0,0,0,0,0,1,20210103,20261231",
        "1,0,0,0,0,0,0,1,20261231,20210103")
    }));

    const found = findings(broken, "calendar-windows-make-sense")
      .filter(finding => finding.message.includes("It runs on nothing."));

    expect(found.length).to.equal(1);
    expect(found[0].ref).to.deep.equal({kind: "service", id: "1"});
  });

  it("catches a boarding point whose station is missing", async () => {
    const broken = await open(brokenFeed({
      "stops.txt": text => text.replace(",910GABRDEEN,3,", ",NO_SUCH_STATION,3,")
    }));

    expect(findings(broken, "boarding-points-have-a-station")[0]?.message)
      .to.contain("NO_SUCH_STATION");
  });

  it("catches a continuation that names no coupling", async () => {
    const broken = await open(brokenFeed({
      "transfers.txt": text => text.replace(
        "9100CRSTRS2,9100CRSTRS2,C04558_20260518_20261207,C04561_20260518_20261207,4",
        "9100CRSTRS2,9100CRSTRS2,,,4")
    }));

    expect(findings(broken, "transfers-name-real-things").map(finding => finding.message))
      .to.contain("transfers.txt row 2 is a continuation with no trips on it, so it names no coupling.");
  });

});

describe("the entity views", () => {

  it("gives a station its boarding points and their distance from it", () => {
    const detail = stopDetail(loaded, "910GABRDEEN");

    expect(detail.row?.stop_name).to.contain("Aberdeen");
    expect(detail.children.length).to.be.greaterThan(0);
    expect(detail.children.every(child => (child.metresFromParent ?? 0) < 100)).to.equal(true);
    expect(detail.childCalls).to.be.greaterThan(0);
  });

  it("says so for a stop the feed does not have, rather than inventing one", () => {
    const detail = stopDetail(loaded, "NO_SUCH_STOP");

    expect(detail.row).to.equal(undefined);
    expect(detail.children).to.deep.equal([]);
  });

  it("gives a trip its calling pattern in calling order", () => {
    const detail = tripDetail(loaded, "C00049_20260517_20261206");

    expect(detail.callsLoaded).to.equal(true);
    expect(detail.calls.length).to.be.greaterThan(1);
    expect(detail.calls.map(call => call.sequence))
      .to.deep.equal(detail.calls.map((_, index) => index + 1));
    expect(detail.calls[0].stopName).to.be.a("string");
  });

  it("expands a trip's calendar to real dates with the exclusions marked", () => {
    const detail = tripDetail(loaded, "C00049_20260517_20261206");

    expect(detail.dates.length).to.be.greaterThan(0);
    expect(detail.runs).to.be.greaterThan(0);
    expect(detail.dates.every(date => date.exception === undefined || !date.runs
      || date.exception === 1)).to.equal(true);
  });

  it("follows a coupling to the other trip and back again", () => {
    const base = tripDetail(loaded, "C04558_20260518_20261207");
    const onward = base.onward[0];

    expect(onward, "the fixture's first split should be followable").to.not.equal(undefined);

    const portion = tripDetail(loaded, onward.tripId);

    expect(portion.prior.map(link => link.tripId)).to.contain("C04558_20260518_20261207");
  });

  it("names a route's trips and says how many there are", () => {
    const detail = routeDetail(loaded, "HX");

    expect(detail.row?.route_id).to.equal("HX");
    expect(detail.totalTrips).to.be.greaterThan(0);
    expect(detail.trips[0].id).to.be.a("string");
  });

  it("gives a service its exceptions and its trips", () => {
    const detail = serviceDetail(loaded, "10");

    expect(detail.row?.service_id).to.equal("10");
    expect(detail.dates.length).to.be.greaterThan(0);
  });

});

describe("the departure board", () => {

  const date = Number(loaded.feed.files.get("feed_info.txt")?.value("feed_start_date", 0)) + 2;

  it("shows what leaves a station on a day, in clock order", () => {
    const board = boardAt(loaded, "910GABRDEEN", date);

    expect(board.callsLoaded).to.equal(true);

    const seconds = board.departures.map(departure => departure.seconds % 86400);

    expect(seconds).to.deep.equal([...seconds].sort((a, b) => a - b));
  });

  it("names the station a train is going to, not the platform it arrives on", () => {
    // No departure board in the country tells a passenger which platform their train arrives on at
    // the other end, and every call in this feed is at a boarding point.
    const board = boardAt(loaded, "910GABRDEEN", date);

    for (const departure of board.departures) {
      expect(departure.destination ?? "").to.not.match(/Platform \d/);
    }
  });

  it("puts a train departing after midnight on the morning a passenger would look for it", () => {
    const withOvernight = [date, date + 1, date + 2, date + 3]
      .map(day => boardAt(loaded, "9100HTRWTM54", day))
      .find(board => board.departures.some(departure => departure.previousDay));

    if (withOvernight !== undefined) {
      const over = withOvernight.departures.filter(departure => departure.previousDay);

      expect(over.every(departure => departure.seconds >= 86400)).to.equal(true);
      expect(over.every(departure => Number(departure.time.slice(0, 2)) < 24)).to.equal(true);
    }
  });

});

describe("querying", () => {

  it("filters the calls down to one trip", () => {
    const page = run(tableOf(loaded.feed, "stop_times.txt")!, {
      file: "stop_times.txt",
      filters: {trip_id: "C00049_20260517_20261206"},
      offset: 0,
      limit: 200
    });

    expect(page.matched).to.be.greaterThan(0);
    expect(page.rows.every(row => row.values.trip_id === "C00049_20260517_20261206")).to.equal(true);
  });

  it("reads a row back at the number a validator would name it by", () => {
    // csvRowNumber is index + 2, which is what makes a notice a link rather than a number.
    const stops = tableOf(loaded.feed, "stops.txt")!;
    const page = run(stops, {file: "stops.txt", filters: {}, offset: 0, limit: 1});

    expect(page.rows[0].index).to.equal(0);
    expect(stops.value("stop_id", 0)).to.equal("9100ABRDEEN3"); // the first row of the file
  });

});
