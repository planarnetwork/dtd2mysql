import {describe, it, expect, beforeAll} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {build} from "./build.js";

/**
 * The whole build, end to end, over a feed small enough to read.
 *
 * `fixtures/mini/RJTTF001.ZIP` is a slice of a real refresh - the TUIDs listed in
 * its README plus everything reachable from them through associations - and
 * `fixtures/mini/golden` is what it produces. The golden is committed as text so
 * that a change in behaviour arrives as a readable diff in review rather than as
 * a hash that moved.
 *
 * To take a change: `UPDATE_GOLDEN=1 yarn vitest run` and read the diff before
 * committing it.
 */
const fixtures = path.join(import.meta.dirname, "..", "fixtures", "mini");
const golden = path.join(fixtures, "golden");
const TODAY = "2026-08-10";

let built: string;

const feed = (file: string) => fs.readFileSync(path.join(built, file), "utf8");
const rows = (file: string) => feed(file).split("\n").filter(line => line !== "").slice(1);
const columns = (file: string) => {
  const lines = feed(file).split("\n").filter(line => line !== "");
  const names = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");

    return Object.fromEntries(names.map((name, i) => [name, values[i]]));
  });
};

beforeAll(async () => {
  built = fs.mkdtempSync(path.join(os.tmpdir(), "golden"));

  await build([
    "node", "dtd2gtfs", "build",
    "--source", path.join(fixtures, "RJTTF001.ZIP"),
    "--out", built,
    "--today", TODAY
  ]);

  if (process.env.UPDATE_GOLDEN) {
    fs.rmSync(golden, {recursive: true, force: true});
    fs.mkdirSync(golden, {recursive: true});

    for (const file of fs.readdirSync(built)) {
      fs.copyFileSync(path.join(built, file), path.join(golden, file));
    }
  }
}, 60_000);

describe("the mini fixture", () => {

  const files = [
    "agency.txt", "stops.txt", "transfers.txt", "links.txt",
    "routes.txt", "trips.txt", "stop_times.txt", "calendar.txt", "calendar_dates.txt"
  ];

  it.each(files)("produces the golden %s", file => {
    expect(feed(file)).to.equal(fs.readFileSync(path.join(golden, file), "utf8"));
  });

  it("produces the same feed twice", async () => {
    const again = fs.mkdtempSync(path.join(os.tmpdir(), "golden"));

    await build(["node", "dtd2gtfs", "build", "--source", path.join(fixtures, "RJTTF001.ZIP"),
                 "--out", again, "--today", TODAY]);

    for (const file of files) {
      expect(fs.readFileSync(path.join(again, file), "utf8")).to.equal(feed(file));
    }
  }, 60_000);

});

describe("the feed the mini fixture produces", () => {

  it("references only stops it declares", () => {
    const declared = new Set(columns("stops.txt").map(s => s.stop_id));
    const called = new Set(columns("stop_times.txt").map(s => s.stop_id));

    expect([...called].filter(stop => !declared.has(stop))).to.deep.equal([]);
  });

  it("references only routes and services it declares", () => {
    const routes = new Set(columns("routes.txt").map(r => r.route_id));
    const services = new Set(columns("calendar.txt").map(c => c.service_id));
    const trips = columns("trips.txt");

    expect(trips.filter(t => !routes.has(t.route_id))).to.deep.equal([]);
    expect(trips.filter(t => !services.has(t.service_id))).to.deep.equal([]);
  });

  it("gives every trip at least two stops", () => {
    const stops = new Map<string, number>();

    for (const stop of columns("stop_times.txt")) {
      stops.set(stop.trip_id, (stops.get(stop.trip_id) ?? 0) + 1);
    }

    expect([...stops].filter(([, count]) => count < 2)).to.deep.equal([]);
    expect(columns("trips.txt").filter(t => !stops.has(t.trip_id))).to.deep.equal([]);
  });

  it("never ends a calendar before it starts", () => {
    expect(columns("calendar.txt").filter(c => c.start_date > c.end_date)).to.deep.equal([]);
  });

  it("moves forward through a trip", () => {
    const late: string[] = [];
    let previous = {trip: "", time: ""};

    for (const stop of columns("stop_times.txt")) {
      if (stop.trip_id === previous.trip && stop.arrival_time < previous.time) {
        late.push(`${stop.trip_id} at ${stop.stop_id}`);
      }

      previous = {trip: stop.trip_id, time: stop.departure_time};
    }

    expect(late).to.deep.equal([]);
  });

  it("gives every trip a unique ID", () => {
    const ids = columns("trips.txt").map(t => t.trip_id);

    expect(ids.length).to.equal(new Set(ids).size);
  });

  it("does not read the MSN header as a station", () => {
    // The header line begins with A, like every station record, and read as one
    // it became stop 4/0 with a name of "F" and coordinates in the South
    // Atlantic
    expect(columns("stops.txt").find(s => s.stop_id === "4/0")).to.equal(undefined);
  });

  it("names every trip after the stop it ends at", () => {
    const names = new Map(columns("stops.txt").map(s => [s.stop_id, s.stop_name]));
    const last = new Map<string, {sequence: number, stop: string}>();

    for (const stopTime of columns("stop_times.txt")) {
      const sequence = Number(stopTime.stop_sequence);
      const seen = last.get(stopTime.trip_id);

      if (!seen || sequence > seen.sequence) {
        last.set(stopTime.trip_id, {sequence, stop: stopTime.stop_id});
      }
    }

    const trips = columns("trips.txt");

    expect(trips.length).to.be.greaterThan(0);

    for (const trip of trips) {
      expect(trip.trip_headsign).to.equal(names.get(last.get(trip.trip_id)!.stop));
    }
  });

  it("does not put the TUID in the headsign, which is where it used to be", () => {
    const trips = columns("trips.txt");

    expect(trips.every(t => t.trip_headsign !== t.trip_id.split("_")[0])).to.equal(true);
  });

  it("claims nothing about wheelchairs or bicycles", () => {
    const trips = columns("trips.txt");

    expect(trips.every(t => t.wheelchair_accessible === "0")).to.equal(true);
    expect(trips.every(t => t.bikes_allowed === "0")).to.equal(true);
  });

  it("puts no platform in stop_headsign", () => {
    expect(columns("stop_times.txt").every(s => s.stop_headsign === "")).to.equal(true);
  });

  it("puts a CIE station in the sea, because its eastings are zero", () => {
    const cie = columns("stops.txt").find(s => s.stop_name.includes("(CIE"));

    expect(cie).to.not.equal(undefined);
    expect(Number(cie!.stop_lat)).to.be.lessThan(0);
  });

  it("carries the replacement buses and the ferry from the ZTR", () => {
    const types = new Set(columns("routes.txt").map(r => r.route_type));

    // 3 bus, 4 ferry, 1 underground, 2 rail
    expect(types).to.include("3");
    expect(types).to.include("4");
  });

  it("rolls a service that departs after midnight into the previous day", () => {
    const late = columns("stop_times.txt").filter(s => s.departure_time >= "24:00:00");

    expect(late.length).to.be.greaterThan(0);
  });

  it("excludes the days an overlay covers from the schedule it overlays", () => {
    const excluded = columns("calendar_dates.txt");

    expect(excluded.length).to.be.greaterThan(0);
    expect(excluded.every(d => d.exception_type === "2")).to.equal(true);
  });

  it("writes no trip for a cancellation, which carries no stops", () => {
    // C02507 runs 17/05 to 13/09 and is cancelled from 17/05 to 09/08. The
    // cancellation has no LO/LI/LT records at all and reaches the build as a row
    // with every stop time column null, which is the shape that used to hang it.
    const trips = columns("trips.txt").map(t => t.trip_id);

    expect(trips).to.include("C02507_20260517_20260913");
    expect(trips).to.not.include("C02507_20260517_20260809");
  });

  it("takes a cancelled day off the schedule it cancels", () => {
    // C00070 is cancelled on 31/10/2026, which falls inside the window
    const trip = columns("trips.txt").find(t => t.trip_id.startsWith("C00070_"))!;
    const dates = columns("calendar_dates.txt")
      .filter(d => d.service_id === trip.service_id)
      .map(d => d.date);

    expect(dates).to.include("20261031");
  });

  it("leaves a cancellation that ends before the window alone", () => {
    // C02507 is cancelled from 17/05 to 09/08 and the build starts on 10/08, so
    // the cancellation is not returned by the query at all. The calendar it
    // cancels still starts on 17/05, which reads as though the train ran on
    // Sundays it did not.
    const trip = columns("trips.txt").find(t => t.trip_id === "C02507_20260517_20260913")!;
    const calendar = columns("calendar.txt").find(c => c.service_id === trip.service_id)!;
    const dates = columns("calendar_dates.txt").filter(d => d.service_id === trip.service_id);

    expect(calendar.start_date).to.equal("20260517");
    expect(dates.map(d => d.date)).to.deep.equal(["20260906", "20260913"]);
  });

});
