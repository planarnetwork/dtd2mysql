import {describe, it, expect, beforeAll} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {zipSync, strToU8} from "fflate";
import {readFeedRows, FeedFileName} from "@gb-transit/gtfs-read";
import {TransferType} from "@gb-transit/gtfs-schema";
import {merge} from "./api.js";

/**
 * The merge, end to end, over two feeds small enough to read.
 *
 * `fixtures/tiny` is two hand-written feeds covering the edges that merging two
 * real feeds does not reach - see its README for what each row is for - and
 * `fixtures/tiny/golden` is what they merge to. The golden is committed as text
 * so a change in behaviour arrives as a readable diff in review.
 *
 * To take a change: `UPDATE_GOLDEN=1 yarn vitest run` and read the diff before
 * committing it.
 */
const fixtures = path.join(import.meta.dirname, "..", "fixtures", "tiny");
const golden = path.join(fixtures, "golden");
const TODAY = "20260601";

let built: string;
let rows: Awaited<ReturnType<typeof readFeedRows>>;

const columns = <F extends FeedFileName>(file: F) => rows[file] ?? [];

/**
 * A fixture directory as a zip, which is what the merge reads.
 */
function zipOf(directory: string): string {
  const entries: Record<string, Uint8Array> = {};

  for (const file of fs.readdirSync(directory).filter(f => f.endsWith(".txt"))) {
    entries[file] = strToU8(fs.readFileSync(path.join(directory, file), "utf8"));
  }

  const out = path.join(built, `${path.basename(directory)}.zip`);

  fs.writeFileSync(out, zipSync(entries));

  return out;
}

beforeAll(async () => {
  built = fs.mkdtempSync(path.join(os.tmpdir(), "gtfsmerge"));

  const output = path.join(built, "merged");

  await merge({
    inputs: [zipOf(path.join(fixtures, "a")), zipOf(path.join(fixtures, "b"))],
    output,
    filterDatesBefore: TODAY,
    tmp: path.join(built, "work")
  });

  if (process.env.UPDATE_GOLDEN) {
    fs.rmSync(golden, {recursive: true, force: true});
    fs.mkdirSync(golden, {recursive: true});

    for (const file of fs.readdirSync(output)) {
      fs.copyFileSync(path.join(output, file), path.join(golden, file));
    }
  }

  built = output;

  const entries: Record<string, Uint8Array> = {};

  for (const file of fs.readdirSync(output).filter(f => f.endsWith(".txt"))) {
    entries[file] = strToU8(fs.readFileSync(path.join(output, file), "utf8"));
  }

  rows = await readFeedRows(zipSync(entries));
}, 60_000);

describe("the tiny fixtures", () => {

  const files = [
    "agency.txt", "calendar.txt", "calendar_dates.txt", "routes.txt", "stops.txt",
    "stop_times.txt", "transfers.txt", "trips.txt"
  ];

  it.each(files)("produces the golden %s", file => {
    expect(fs.readFileSync(path.join(built, file), "utf8"))
      .to.equal(fs.readFileSync(path.join(golden, file), "utf8"));
  });

});

describe("the merged feed", () => {

  it("keeps both agencies", () => {
    expect(columns("agency.txt").map(a => a.agency_id).sort()).to.deep.equal(["BUS", "RAIL"]);
  });

  it("keeps both modes", () => {
    const types = new Set(columns("routes.txt").map(r => r.route_type));

    expect(types).to.include(2);
    expect(types).to.include(3);
  });

  it("has one row for a stop both feeds describe", () => {
    const alpha = columns("stops.txt").filter(s => s.stop_id === "910GALPHA");

    // Both feeds serve Alpha. This is why a GB rail feed and a GB bus feed can
    // be merged without a --stop-prefix: they already agree on ATCO codes.
    expect(alpha.length).to.equal(1);
  });

  it("gives every trip a unique id", () => {
    const ids = columns("trips.txt").map(t => t.trip_id);

    expect(new Set(ids).size).to.equal(ids.length);
  });

  it("resolves every trip's route and service", () => {
    const routes = new Set(columns("routes.txt").map(r => r.route_id));
    const services = new Set(columns("calendar.txt").map(c => String(c.service_id)));

    for (const trip of columns("trips.txt")) {
      expect(routes.has(trip.route_id)).to.equal(true);
      expect(services.has(String(trip.service_id))).to.equal(true);
    }
  });

  it("resolves every stop time's trip and stop", () => {
    const trips = new Set(columns("trips.txt").map(t => t.trip_id));
    const stops = new Set(columns("stops.txt").map(s => s.stop_id));

    for (const stopTime of columns("stop_times.txt")) {
      expect(trips.has(stopTime.trip_id)).to.equal(true);
      expect(stops.has(stopTime.stop_id)).to.equal(true);
    }
  });

  it("resolves both ends of every transfer", () => {
    const stops = new Set(columns("stops.txt").map(s => s.stop_id));

    for (const transfer of columns("transfers.txt")) {
      expect(stops.has(transfer.from_stop_id)).to.equal(true);
      expect(stops.has(transfer.to_stop_id)).to.equal(true);
    }
  });

  it("does not publish a stop nothing calls at", () => {
    const called = new Set(columns("stop_times.txt").map(s => s.stop_id));

    for (const stop of columns("stops.txt")) {
      expect(called.has(stop.stop_id)).to.equal(true);
    }
  });

  it("calls at the station rather than the platform", () => {
    const stops = new Set(columns("stops.txt").map(s => s.stop_id));

    expect(stops.has("9100ALPHA1")).to.equal(false);
    expect(stops.has("910GALPHA")).to.equal(true);
  });

  it("collapses the three identical calendars onto one service", () => {
    // SA1, SA2 and SB1 all run Monday to Friday over the same dates.
    const running = columns("calendar.txt").filter(c => c.start_date === "20260101");

    expect(running.length).to.equal(1);
  });

  it("synthesises a calendar for the dates that had none", () => {
    expect(columns("calendar_dates.txt").length).to.be.greaterThan(0);

    const services = new Set(columns("calendar.txt").map(c => String(c.service_id)));

    for (const date of columns("calendar_dates.txt")) {
      expect(services.has(String(date.service_id))).to.equal(true);
    }
  });

  it("drops a service that has already finished", () => {
    for (const calendar of columns("calendar.txt")) {
      expect(calendar.end_date! >= TODAY).to.equal(true);
    }
  });

  it("keeps the coupling, pointing at the renumbered trips", () => {
    const couplings = columns("transfers.txt")
      .filter(t => t.transfer_type === TransferType.InSeat);
    const trips = new Set(columns("trips.txt").map(t => t.trip_id));

    expect(couplings.length).to.equal(1);
    expect(trips.has(couplings[0].from_trip_id!)).to.equal(true);
    expect(trips.has(couplings[0].to_trip_id!)).to.equal(true);
  });

  it("generates a walk transfer between the bus station and the rail station", () => {
    // About 200m apart. This is the reason to merge the two feeds at all.
    const walk = columns("transfers.txt").find(
      t => t.from_stop_id === "9100BUSSTOP" && t.to_stop_id === "910GALPHA"
    );

    expect(walk).to.not.equal(undefined);
    expect(walk!.transfer_type).to.equal(TransferType.MinTime);
    expect(walk!.min_transfer_time).to.be.greaterThan(60);
  });

  it("keeps a name containing a quote and a headsign containing a comma", () => {
    const beta = columns("stops.txt").find(s => s.stop_id === "910GBETA");
    const headsigns = columns("trips.txt").map(t => t.trip_headsign);

    expect(beta!.stop_name).to.equal("The \"Bull\" Inn");
    expect(headsigns).to.include("Inverness, Aberdeen and Fort William");
  });

  it("writes the platform_code column a rail feed uses", () => {
    // gtfsmerge did not write this column before. Dropping it would throw away
    // how the rail feed says which platform a boarding point is.
    // gtfsmerge did not write this column at all before. The rail feed says
    // which platform a boarding point is in it, and a merge that dropped the
    // column would throw that away. The published stops here are all stations,
    // so the column is present and empty.
    const header = fs.readFileSync(path.join(built, "stops.txt"), "utf8").split("\n")[0];

    expect(header.split(",")).to.include("platform_code");
  });

});
