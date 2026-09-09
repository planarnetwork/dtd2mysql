import { describe, it, expect } from "vitest";
import { strToU8, zipSync } from "fflate";
import { GTFSFetchError, loadGTFS, loadGTFSFromUrl } from "./GTFSLoader.js";
import type { LoadProgress } from "./Progress.js";

const FEED = {
  "stops.txt": "stop_id,stop_code,stop_name,stop_lat,stop_lon\nA,AAA,Ayton,1,2\nB,BBB,Beeton,3,4\n",
  "calendar.txt":
    "service_id,start_date,end_date,monday,tuesday,wednesday,thursday,friday,saturday,sunday\n"
    + "s1,20250101,20251231,1,1,1,1,1,1,1\n",
  "trips.txt":
    "route_id,service_id,trip_id,trip_headsign,trip_short_name,shape_id\n"
    + "r1,s1,t1,Beeton,X100,sh1\n",
  "stop_times.txt":
    "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type\n"
    + "t1,10:00:00,10:00:00,A,1,0,0\n"
    + "t1,10:30:00,10:30:00,B,2,0,0\n",
  "transfers.txt": "from_stop_id,to_stop_id,min_transfer_time,mode\nA,A,300,\nA,B,600,TRANSFER|TUBE\n",
  "feed_info.txt": "feed_start_date,feed_end_date,feed_version\n20250101,20251231,1\n",
  "routes.txt": "route_id,agency_id,route_short_name,route_type\nr1,=a1,X,2\n",
  "agency.txt": "agency_id,agency_name\n=a1,Anytown Buses\n",
  "areas.txt": "area_id,area_name\nz1,Anytown Central\n",
  "stop_areas.txt": "area_id,stop_id\nz1,A\nz1,B\n",
  // Deliberately out of sequence order, because GTFS does not require it to be in one
  "shapes.txt":
    "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled\n"
    + "sh1,3,4,3,\n"
    + "sh1,1,2,1,\n"
    + "sh1,2,3,2,\n"
};

function feedZip(files: Record<string, string> = FEED): Uint8Array<ArrayBuffer> {
  const contents: Record<string, Uint8Array> = {};

  for (const [name, text] of Object.entries(files)) {
    contents[name] = strToU8(text);
  }

  return zipSync(contents);
}

function without(...files: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(FEED).filter(([name]) => !files.includes(name)));
}

describe("loadGTFS", () => {

  it("loads a feed from bytes", async () => {
    const feed = await loadGTFS(feedZip());

    expect(feed.trips.length).to.equal(1);
    expect(feed.trips[0].tripId).to.equal("t1");
    expect(feed.trips[0].stopTimes.length).to.equal(2);
    expect(Object.keys(feed.stops).length).to.equal(2);
    expect(feed.interchange.A).to.equal(300);
    expect(feed.feedInfo?.startDate).to.equal(20250101);
  });

  it("loads a feed from a Blob", async () => {
    const feed = await loadGTFS(new Blob([feedZip()]));

    expect(feed.trips.length).to.equal(1);
  });

  it("loads a feed that nests its files in a directory", async () => {
    const nested: Record<string, string> = {};

    for (const [name, text] of Object.entries(FEED)) {
      nested[`gtfs/${name}`] = text;
    }

    expect((await loadGTFS(feedZip(nested))).trips.length).to.equal(1);
  });

  it("gives the trip a working calendar", async () => {
    const feed = await loadGTFS(feedZip());

    expect(feed.trips[0].service.runsOn(20250601, 1)).to.equal(true);
    expect(feed.trips[0].service.runsOn(20240601, 1)).to.equal(false);
  });

  it("reads a coupling as a link and leaves the interchange times alone", async () => {
    const feed = await loadGTFS(feedZip({
      ...FEED,
      "trips.txt": "trip_id,service_id\nt1,s1\nt2,s1\n",
      "transfers.txt":
        "from_stop_id,to_stop_id,from_trip_id,to_trip_id,transfer_type,min_transfer_time\n"
        + "A,A,,,2,300\n"
        + "B,B,t1,t2,4,\n"
    }));

    expect(feed.links).to.deep.equal([{ fromTripId: "t1", toTripId: "t2", fromStop: "B", toStop: "B" }]);
    expect(feed.interchange.A).to.equal(300);
    expect(feed.interchange.B).to.equal(undefined);
  });

  it("ignores transfers that are forbidden or need re-boarding", async () => {
    const feed = await loadGTFS(feedZip({
      ...FEED,
      "transfers.txt":
        "from_stop_id,to_stop_id,transfer_type,min_transfer_time\nA,A,3,\nA,B,3,600\nB,B,5,\n"
    }));

    expect(feed.links.length).to.equal(0);
    expect(Object.keys(feed.interchange).length).to.equal(0);
    expect(Object.keys(feed.transfers).length).to.equal(0);
  });

  it("resolves a trip through its route to its operator", async () => {
    const feed = await loadGTFS(feedZip());
    const [trip] = feed.trips;

    expect(trip.shortName).to.equal("X100");
    expect(trip.headsign).to.equal("Beeton");
    expect(feed.routes[trip.routeId as string].shortName).to.equal("X");
    expect(feed.agencies[feed.routes[trip.routeId as string].agencyId as string].name)
      .to.equal("Anytown Buses");
  });

  it("reads the line a trip runs over, in sequence order", async () => {
    const feed = await loadGTFS(feedZip());

    expect(feed.trips[0].shapeId).to.equal("sh1");
    expect(feed.shapes["sh1"]).to.deep.equal([
      {latitude: 1, longitude: 2},
      {latitude: 2, longitude: 3},
      {latitude: 3, longitude: 4}
    ]);
  });

  it("drops a point with no sequence rather than letting it scramble the line", async () => {
    // +undefined is NaN, and a comparator returning NaN leaves the sort unspecified - so a row with
    // no sequence takes the whole line down with it rather than itself.
    const feed = await loadGTFS(feedZip({
      ...FEED,
      "shapes.txt":
        "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled\n"
        + "sh1,3,4,3,\n"
        + "sh1,9,9,,\n"
        + "sh1,1,2,1,\n"
        + "sh1,2,3,2,\n"
    }));

    expect(feed.shapes["sh1"]).to.deep.equal([
      {latitude: 1, longitude: 2},
      {latitude: 2, longitude: 3},
      {latitude: 3, longitude: 4}
    ]);
  });

  it("drops a point whose coordinate is not a number", async () => {
    const feed = await loadGTFS(feedZip({
      ...FEED,
      "shapes.txt":
        "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled\n"
        + "sh1,1,2,1,\n"
        + "sh1,nowhere,2,2,\n"
        + "sh1,3,4,3,\n"
    }));

    expect(feed.shapes["sh1"]).to.deep.equal([
      {latitude: 1, longitude: 2},
      {latitude: 3, longitude: 4}
    ]);
  });

  it("gives a trip no shape when trips.txt names none", async () => {
    const feed = await loadGTFS(feedZip({
      ...FEED,
      "trips.txt": "route_id,service_id,trip_id,shape_id\nr1,s1,t1,\n"
    }));

    expect(feed.trips[0].shapeId).to.equal(undefined);
  });

  it("loads a feed with no shapes.txt as one with no shapes", async () => {
    const feed = await loadGTFS(feedZip(without("shapes.txt")));

    expect(feed.shapes).to.deep.equal({});
  });

  it("reads the areas as one index", async () => {
    const { areas } = await loadGTFS(feedZip());

    expect(areas.z1.name).to.equal("Anytown Central");
    expect(areas.z1.stops).to.deep.equal(["A", "B"]);
  });

  it("reads how a transfer is made", async () => {
    const { transfers } = await loadGTFS(feedZip());

    expect(transfers.A[0].mode).to.equal("TRANSFER|TUBE");
  });

  it("loads a feed that has none of the files those come from", async () => {
    const feed = await loadGTFS(feedZip(without("routes.txt", "agency.txt", "areas.txt", "stop_areas.txt")));

    expect(feed.trips.length).to.equal(1);
    expect(feed.routes).to.deep.equal({});
    expect(feed.agencies).to.deep.equal({});
    expect(feed.areas).to.deep.equal({});
  });

  it("gives a trip no route when trips.txt does not name one", async () => {
    const feed = await loadGTFS(feedZip({ ...FEED, "trips.txt": "trip_id,service_id\nt1,s1\n" }));

    expect(feed.trips[0].routeId).to.equal(undefined);
    expect(feed.trips[0].shortName).to.equal(undefined);
    expect(feed.trips[0].headsign).to.equal(undefined);
  });

  it("reports progress and finishes with the building phase", async () => {
    const reports: LoadProgress[] = [];

    await loadGTFS(feedZip(), { onProgress: p => reports.push({ ...p }), progressInterval: 0 });

    expect(reports.length > 0).to.equal(true);
    expect(reports[reports.length - 1].phase).to.equal("building");
    expect(reports[reports.length - 1].rows > 0).to.equal(true);
  });

  it("knows the size of the zip when the source knows it", async () => {
    const zip = feedZip();
    const reports: LoadProgress[] = [];

    await loadGTFS(zip, { onProgress: p => reports.push({ ...p }), progressInterval: 0 });

    expect(zip.length).to.equal(reports[reports.length - 1].bytesTotal);
  });

  /**
   * Reading a zip forwards means anything that is not one simply yields no entries, without
   * complaint, so a url that returns an error page with a 200 would otherwise load as an empty
   * feed and only go wrong later when nothing could be planned.
   */
  it("refuses a source that is not a GTFS zip", async () => {
    const page = new TextEncoder().encode("<html><body>404 Not Found</body></html>");

    await expect(loadGTFS(page)).rejects.toThrow(/No GTFS files found/);
  });

  it("refuses a zip with no GTFS files in it", async () => {
    await expect(loadGTFS(feedZip({ "readme.txt": "nothing to see" }))).rejects.toThrow(/No GTFS files found/);
  });

  it("does not report progress when nobody asked for it", async () => {
    // no assertion beyond it not throwing: the row counter is skipped entirely in this case
    expect((await loadGTFS(feedZip(), {})).trips.length).to.equal(1);
  });

  it("reports the file it is reading and how big it is", async () => {
    const reports: LoadProgress[] = [];

    await loadGTFS(feedZip(), { onProgress: p => reports.push({ ...p }), progressInterval: 0 });

    const stopTimes = reports.find(r => r.entry === "stop_times.txt");

    expect(stopTimes !== undefined).to.equal(true);
    expect(FEED["stop_times.txt"].length).to.equal(stopTimes?.entryBytesTotal);
  });

  /**
   * The first report always goes out, so a caller showing a progress bar has something to show
   * straight away rather than after the first interval has passed.
   */
  it("throttles progress to the interval it was given", async () => {
    const reports: LoadProgress[] = [];

    // an interval nothing can beat, so only the first report and the last one get through
    await loadGTFS(feedZip(), { onProgress: p => reports.push({ ...p }), progressInterval: 60000 });

    expect(reports.length).to.equal(2);
    expect(reports[0].phase).to.equal("reading");
    expect(reports[1].phase).to.equal("building");
  });

});

describe("loadGTFSFromUrl", () => {

  it("loads a feed the server returns", async () => {
    const feed = await loadGTFSFromUrl("https://example.com/gtfs.zip", {
      fetch: async () => new Response(feedZip())
    });

    expect(feed.trips.length).to.equal(1);
  });

  it("passes the headers and signal on to the fetch", async () => {
    let seen: RequestInit | undefined;

    await loadGTFSFromUrl("https://example.com/gtfs.zip", {
      headers: { "x-api-key": "secret" },
      fetch: async (_url, init) => { seen = init; return new Response(feedZip()); }
    });

    expect((seen?.headers as Record<string, string>)["x-api-key"]).to.equal("secret");
  });

  it("reports the status when the server refuses", async () => {
    const failing = loadGTFSFromUrl("https://example.com/gtfs.zip", {
      fetch: async () => new Response("nope", { status: 404 })
    });

    await expect(failing).rejects.toThrow(/responded 404/);
  });

  /**
   * A browser gives no detail at all when it blocks a cross origin request, so the error has to
   * say what the cause almost certainly was rather than passing on a bare "Failed to fetch".
   */
  it("explains that a failed fetch is probably CORS", async () => {
    const failing = loadGTFSFromUrl("https://example.com/gtfs.zip", {
      fetch: async () => { throw new TypeError("Failed to fetch"); }
    });

    await expect(failing).rejects.toThrow(/Access-Control-Allow-Origin/);
    await expect(failing).rejects.toBeInstanceOf(GTFSFetchError);
  });

  it("keeps the underlying error as the cause", async () => {
    const cause = new TypeError("Failed to fetch");

    try {
      await loadGTFSFromUrl("https://example.com/gtfs.zip", { fetch: async () => { throw cause; } });
      expect.unreachable();
    }
    catch (e) {
      expect(cause).to.equal((e as GTFSFetchError).cause);
      expect((e as GTFSFetchError).url).to.equal("https://example.com/gtfs.zip");
    }
  });

  /**
   * An abort is the caller's own doing, so dressing it up as a fetch failure would be misleading.
   */
  it("reports an abort as itself rather than as a fetch failure", async () => {
    const controller = new AbortController();

    controller.abort();

    const failing = loadGTFSFromUrl("https://example.com/gtfs.zip", {
      signal: controller.signal,
      fetch: async (_url, init) => {
        init?.signal?.throwIfAborted();

        return new Response(feedZip());
      }
    });

    await expect(failing).rejects.not.toBeInstanceOf(GTFSFetchError);
  });

  it("accepts a URL as well as a string", async () => {
    const feed = await loadGTFSFromUrl(new URL("https://example.com/gtfs.zip"), {
      fetch: async () => new Response(feedZip())
    });

    expect(feed.trips.length).to.equal(1);
  });

});
