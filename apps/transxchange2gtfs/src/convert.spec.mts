import {describe, it, expect, beforeAll} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {zipSync, strToU8} from "fflate";
import {readFeedRows, FeedFileName} from "@gb-transit/gtfs-read";
import {RouteType, TransferType} from "@gb-transit/gtfs-schema";
import {convert} from "./api.js";

/**
 * The whole conversion, end to end, over a feed small enough to read.
 *
 * `fixtures/mini/mini.xml` is a hand-written TransXChange 2.4 service - see the
 * README for what each element is there to cover - and `fixtures/mini/golden` is
 * what it produces. The golden is committed as text so that a change in
 * behaviour arrives as a readable diff in review rather than as a hash that
 * moved.
 *
 * `--naptan` is what makes this a test rather than a download: the national CSV
 * is around 100MB and a suite that depends on the DfT being up is not a suite.
 *
 * To take a change: `UPDATE_GOLDEN=1 yarn vitest run` and read the diff before
 * committing it.
 */
const fixtures = path.join(import.meta.dirname, "..", "fixtures", "mini");
const golden = path.join(fixtures, "golden");

let built: string;
let rows: Awaited<ReturnType<typeof readFeedRows>>;

const columns = <F extends FeedFileName>(file: F) => rows[file] ?? [];

async function build(input: string, into: string): Promise<void> {
  await convert({
    inputs: [input],
    output: into,
    naptanFile: path.join(fixtures, "naptan.csv"),
    tmp: fs.mkdtempSync(path.join(os.tmpdir(), "txcwork"))
  });
}

beforeAll(async () => {
  built = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "txc")), "feed");

  await build(path.join(fixtures, "mini.xml"), built);

  if (process.env.UPDATE_GOLDEN) {
    fs.rmSync(golden, {recursive: true, force: true});
    fs.mkdirSync(golden, {recursive: true});

    for (const file of fs.readdirSync(built)) {
      fs.copyFileSync(path.join(built, file), path.join(golden, file));
    }
  }

  const entries: Record<string, Uint8Array> = {};

  for (const file of fs.readdirSync(built).filter(f => f.endsWith(".txt"))) {
    entries[file] = strToU8(fs.readFileSync(path.join(built, file), "utf8"));
  }

  rows = await readFeedRows(zipSync(entries));
}, 60_000);

describe("the mini fixture", () => {

  const files = [
    "agency.txt", "calendar.txt", "calendar_dates.txt", "routes.txt", "shapes.txt", "stops.txt",
    "stop_times.txt", "transfers.txt", "trips.txt"
  ];

  it.each(files)("produces the golden %s", file => {
    expect(fs.readFileSync(path.join(built, file), "utf8"))
      .to.equal(fs.readFileSync(path.join(golden, file), "utf8"));
  });

  it("produces the same feed twice", async () => {
    const again = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "txc")), "feed");

    await build(path.join(fixtures, "mini.xml"), again);

    for (const file of files) {
      expect(fs.readFileSync(path.join(again, file), "utf8"))
        .to.equal(fs.readFileSync(path.join(built, file), "utf8"));
    }
  }, 60_000);

  it("reads a zip of a zip of XML, as a BODS download is", async () => {
    const nested = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "txc")), "feed");

    await build(path.join(fixtures, "nested.zip"), nested);

    expect(fs.readFileSync(path.join(nested, "trips.txt"), "utf8"))
      .to.equal(fs.readFileSync(path.join(built, "trips.txt"), "utf8"));
  }, 60_000);

});

describe("the feed the mini fixture produces", () => {

  it("resolves every trip's route and service", () => {
    const routes = new Set(columns("routes.txt").map(r => r.route_id));
    const services = new Set(columns("calendar.txt").map(c => String(c.service_id)));

    expect(columns("trips.txt").length).to.be.greaterThan(0);

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

  it("resolves every trip's shape", () => {
    const shapes = new Set(columns("shapes.txt").map(s => s.shape_id));

    for (const trip of columns("trips.txt")) {
      expect(shapes.has(trip.shape_id!)).to.equal(true);
    }
  });

  it("gives every trip a unique id, and its stops an increasing sequence", () => {
    const ids = columns("trips.txt").map(t => t.trip_id);

    expect(new Set(ids).size).to.equal(ids.length);

    const bySequence = new Map<string, number>();

    for (const stopTime of columns("stop_times.txt")) {
      const last = bySequence.get(stopTime.trip_id) ?? -1;

      expect(stopTime.stop_sequence).to.be.greaterThan(last);
      bySequence.set(stopTime.trip_id, stopTime.stop_sequence);
    }
  });

  it("emits one route per line of the service", () => {
    // TransXChange lets a service carry several lines; GTFS has no such idea, so
    // each becomes a route of its own.
    expect(columns("routes.txt").map(r => r.route_id).sort())
      .to.deep.equal(["PB0000815:1|L1", "PB0000815:1|L2"]);
  });

  it("calls the service a bus", () => {
    for (const route of columns("routes.txt")) {
      expect(route.route_type).to.equal(RouteType.Bus);
    }
  });

  it("names a stop from NaPTAN rather than from the feed", () => {
    const temple = columns("stops.txt").find(s => s.stop_id === "0100BRP90310");

    // The feed says "Temple Meads Station". NaPTAN adds the indicator, the
    // street and the town, and the `->` in an indicator is dropped.
    expect(temple!.stop_name).to.equal("Temple Meads Station (NE), Station Approach, Bristol");
    expect(temple!.stop_code).to.equal("bstgjpm");
  });

  it("does not add a street name that the stop name already contains", () => {
    // "Victoria Street" is on Victoria Street, and saying so twice reads badly.
    const victoria = columns("stops.txt").find(s => s.stop_id === "0100BRP90311");

    expect(victoria!.stop_name).to.equal("Victoria Street (SW), Bristol");
  });

  it("keeps a route description containing a comma", () => {
    const quoted = columns("routes.txt").find(r => r.route_id === "PB0000815:1|L2");

    expect(quoted!.route_long_name).to.equal("Temple Meads to Clifton, via Victoria Street");
  });

  it("excludes the bank holidays the operating profile does not run on", () => {
    const excluded = columns("calendar_dates.txt")
      .filter(d => d.exception_type === 2)
      .map(d => d.date);

    // Christmas Day and Boxing Day 2026, resolved from the profile rather than
    // from a list kept in the source.
    expect(excluded).to.include("20261225");
    expect(excluded).to.include("20261226");
  });

  it("excludes a special day the journey does not run on", () => {
    const excluded = columns("calendar_dates.txt").map(d => d.date);

    expect(excluded).to.include("20260824");
  });

  it("gives a Saturday journey a calendar of its own", () => {
    const saturday = columns("calendar.txt").filter(c => c.saturday === 1 && c.monday === 0);

    expect(saturday.length).to.equal(1);
  });

  it("carries the block a vehicle works", () => {
    const blocks = columns("trips.txt").map(t => t.block_id).filter(b => b !== undefined);

    expect(blocks).to.include("BLK1");
  });

  it("lets a vehicle journey override a timing link's run time", () => {
    // VJ2 overrides JPTL1 from 4 minutes to 7, so its second call is at 08:37
    // where VJ1's is at 07:34.
    const calls = (trip: string) => columns("stop_times.txt")
      .filter(s => s.trip_id === trip)
      .map(s => s.departure_time);

    expect(calls("1")[1]).to.equal("07:34:00");
    expect(calls("2")[1]).to.equal("08:37:00");
  });

  it("shapes the route, scaled to the distance TransXChange declares", () => {
    const points = columns("shapes.txt");

    expect(points.length).to.be.greaterThan(0);

    // The final point is at the total of the three route link distances,
    // 900 + 600 + 700 metres, in kilometres.
    const last = points[points.length - 1];

    expect(Number(last.shape_dist_traveled)).to.be.closeTo(2.2, 1e-6);
  });

  it("gives every stop an interchange time with itself", () => {
    const self = columns("transfers.txt").filter(t => t.from_stop_id === t.to_stop_id);

    expect(self.length).to.equal(columns("stops.txt").length);

    for (const transfer of self) {
      expect(transfer.transfer_type).to.equal(TransferType.MinTime);
    }
  });

  it("writes no feed_info.txt, because TransXChange has nothing to build one from", () => {
    expect(fs.existsSync(path.join(built, "feed_info.txt"))).to.equal(false);
  });

});
