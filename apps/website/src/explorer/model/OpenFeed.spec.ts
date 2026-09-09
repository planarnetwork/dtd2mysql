import {describe, it, expect} from "vitest";
import {zipSync} from "fflate";
import {NotAFeedError, openFeed} from "./OpenFeed.js";
import {callsAtStop, callsOnTrip} from "./FeedIndex.js";
import {goldenFeed} from "../test/golden.js";

const feed = goldenFeed();

describe("openFeed", () => {

  it("reads every file, calls included, in one pass", async () => {
    const index = await openFeed("golden.zip", feed);

    expect([...index.files.keys()].sort()).to.deep.equal([
      "agency.txt", "attributions.txt", "calendar.txt", "calendar_dates.txt", "feed_info.txt",
      "routes.txt", "stops.txt", "transfers.txt", "trips.txt"
    ]);
    expect(index.files.get("stops.txt")?.rows).to.equal(345);
    expect(index.files.get("trips.txt")?.rows).to.equal(128);
    expect(index.files.get("transfers.txt")?.rows).to.equal(293);
    expect(index.calls?.rows).to.equal(1326);
  });

  it("names stop_times.txt in the manifest, counted like every other file", async () => {
    const index = await openFeed("golden.zip", feed);
    const calls = index.manifest.files.find(file => file.name === "stop_times.txt");

    expect(calls?.rows).to.equal(1326);
    expect(calls?.notHeld).to.deep.equal(["stop_headsign", "shape_dist_traveled"]);
  });

  it("lists the files in the order an overview should read them", async () => {
    const index = await openFeed("golden.zip", feed);

    expect(index.manifest.files.slice(0, 4).map(file => file.name)).to.deep.equal([
      "feed_info.txt", "agency.txt", "attributions.txt", "routes.txt"
    ]);
  });

  it("reports the columns the schema knows that a file does not carry", async () => {
    const index = await openFeed("golden.zip", feed);
    const stops = index.manifest.files.find(file => file.name === "stops.txt");

    expect(stops?.unknown).to.deep.equal([]);
    expect(stops?.missing).to.deep.equal([]);
  });

  it("reports a column the schema has never heard of rather than dropping it", async () => {
    const broken = zipSync({"stops.txt": new TextEncoder().encode("stop_id,wibble\nS1,42\n")});
    const index = await openFeed("odd.zip", broken);

    expect(index.manifest.files[0].unknown).to.deep.equal(["wibble"]);
    expect(index.files.get("stops.txt")?.value("wibble", 0)).to.equal("42");
  });

  it("refuses a zip that is not a feed, rather than opening an empty one", async () => {
    // readFeed has no such guard, only loadGTFS does, so this is ours to make.
    const notAFeed = zipSync({"holiday.txt": new TextEncoder().encode("hello\n")});

    await expect(openFeed("holiday.zip", notAFeed)).rejects.toThrow(NotAFeedError);
  });

  it("reads a feed nested in a directory the same as one that is not", async () => {
    const nested = zipSync({"feed/stops.txt": new TextEncoder().encode("stop_id\nS1\n")});
    const index = await openFeed("nested.zip", nested);

    expect(index.files.get("stops.txt")?.rows).to.equal(1);
  });

  it("reports progress as it goes", async () => {
    const seen: string[] = [];

    await openFeed("golden.zip", feed, {
      progressInterval: 0,
      onProgress: progress => seen.push(progress.phase)
    });

    expect(seen).to.contain("reading");
    expect(seen.at(-1)).to.equal("building");
  });

});

describe("the calls", () => {

  it("reads the calls and indexes them by trip and by stop", async () => {
    const index = await openFeed("golden.zip", feed);

    expect(index.calls?.rows).to.equal(1326);
    expect(index.byTrip?.contiguous).to.equal(true);
  });

  it("gives a trip its calls in calling order", async () => {
    const index = await openFeed("golden.zip", feed);
    const calls = callsOnTrip(index, "C00049_20260517_20261206");
    const sequences = [...calls].map(row => (index.calls as NonNullable<typeof index.calls>).sequence[row]);

    expect(calls.length).to.be.greaterThan(1);
    expect(sequences).to.deep.equal([...sequences].sort((a, b) => a - b));
    expect(sequences[0]).to.equal(1);
  });

  it("gives a stop its calls", async () => {
    const index = await openFeed("golden.zip", feed);

    expect(callsAtStop(index, "9100HTRWTM54").length).to.be.greaterThan(0);
    expect(callsAtStop(index, "nothing calls here").length).to.equal(0);
  });

  it("reads the times past midnight the fixture carries", async () => {
    const index = await openFeed("golden.zip", feed);
    const calls = index.calls as NonNullable<typeof index.calls>;

    let past = 0;

    for (let row = 0; row < calls.rows; row++) {
      if (calls.departure[row] >= 24 * 3600) {
        past++;
      }
    }

    expect(past).to.be.greaterThan(0);
    expect(calls.unreadableTimes).to.equal(0);
  });

});
