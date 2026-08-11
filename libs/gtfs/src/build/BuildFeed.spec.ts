import {describe, it, expect} from "vitest";
import {Writable} from "stream";
import {BuildFeed} from "./BuildFeed";
import {BuildContext, DateRange, parseRange} from "./BuildContext";
import {Enricher} from "../enrich/Enricher";
import {GTFSOutput} from "./GTFSOutput";
import {ScheduleResults} from "./ScheduleBuilder";
import {Association} from "../model/Association";
import {NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {Schedule} from "../model/Schedule";
import {RouteType} from "../entity/Route";
import {STP} from "../model/OverlayRecord";
import {StopTime} from "../entity/StopTime";
import {Stop} from "../entity/Stop";
import {Transfer} from "../entity/Transfer";
import {interchange} from "../transform/MergeTransfers";
import {FixedLink} from "../entity/FixedLink";
import {TimetableSource} from "../source/TimetableSource";

/**
 * Collects what the build writes, per file, instead of putting it on disk.
 */
class MemoryOutput implements GTFSOutput {

  public readonly files: {[filename: string]: any[]} = {};

  public open(filename: string): Writable {
    const rows = this.files[filename.replace(/^.*\//, "")] = [] as any[];

    return new Writable({objectMode: true, write(row, _encoding, done) {
      rows.push(row);
      done();
    }});
  }

  public end(): void {}

}

const stopTime = (stop: string, tripId: string, sequence: number): StopTime => ({
  trip_id: tripId,
  arrival_time: "10:00:00",
  departure_time: "10:01:00",
  stop_id: stop,
  stop_sequence: sequence,
  stop_headsign: null,
  pickup_type: 0,
  drop_off_type: 0,
  shape_dist_traveled: null,
  timepoint: 1,
    platform: null,
    tiploc: null
});

function schedule(id: number, tuid: string, from: string, to: string, operator: string, stops: string[]): Schedule {
  const trip = `${tuid}_${from.replace(/-/g, "")}_${to.replace(/-/g, "")}`;

  return new Schedule(
    id,
    stops.map((stop, i) => stopTime(stop, trip, i + 1)),
    tuid,
    "",
    new ScheduleCalendar(
      Temporal.PlainDate.from(from),
      Temporal.PlainDate.from(to),
      {...NO_DAYS, 1: 1}
    ),
    RouteType.Rail,
    operator,
    STP.Permanent,
    true,
    false
  );
}

const stop = (crs: string, tiploc: string): Stop => ({
  stop_id: `910G${tiploc}`, crs, tiploc, stop_name: crs, stop_desc: "", stop_lat: 0, stop_lon: 0,
  zone_id: 0, stop_url: "", location_type: 0, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0, located: true
});

const transfer = (from: string, to: string): Transfer =>
  ({...interchange(from, 300), to_stop_id: to});

const link = (from: string, to: string): FixedLink => ({
  from_stop_id: from, to_stop_id: to, mode: "WALK", duration: 300,
  start_time: "00:00:00", end_time: "23:59:59", start_date: "2017-01-01", end_date: "2038-01-19",
  monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1, sunday: 1
});

class FakeSource implements TimetableSource {

  constructor(
    private readonly schedules: Schedule[],
    private readonly stops: Stop[] = [],
    private readonly transfers: Transfer[] = [],
    private readonly links: FixedLink[] = []
  ) {}

  /**
   * The stops the test declared, or one for every stop its schedules call at if
   * it declared none. The build drops calls at stops it does not publish, and
   * most of these tests are about ordering rather than about stops - they would
   * otherwise end up with no stop times at all. A test that does declare stops
   * gets exactly those, including the deliberately malformed ones.
   */
  async getStops() {
    if (this.stops.length > 0) {
      return this.stops;
    }

    const called = this.schedules.flatMap(s => s.stopTimes.map(stopTime => stopTime.stop_id));

    // The TIPLOC a made up station gets is its CRS code, which is enough for the
    // ids to be built from and to differ from each other.
    return [...new Set(called)].sort().map(crs => stop(crs, crs));
  }
  async getTransfers() { return this.transfers; }
  async getFeedVersion() { return "RJTTF001.ZIP"; }
  async getFixedLinks() { return this.links; }
  async getAssociations(_: DateRange): Promise<Association[]> { return []; }
  async end() {}

  async getSchedules(_: DateRange): Promise<ScheduleResults> {
    return {schedules: this.schedules, idGenerator: ids()};
  }

}

function* ids(): IterableIterator<number> {
  let id = 100000;

  while (true) {
    yield id++;
  }
}

const context: BuildContext = {
  today: Temporal.PlainDate.from("2024-01-01"),
  range: parseRange("3 MONTH"),
  links: true
};

async function build(source: TimetableSource, enrichers: Enricher[] = []): Promise<MemoryOutput> {
  const output = new MemoryOutput();

  await new BuildFeed(source, output, context, enrichers).build(".");

  return output;
}

const feed = () => [
  schedule(3, "C00003", "2024-01-01", "2024-03-01", "SN", ["SEV", "TON"]),
  schedule(1, "C00001", "2024-01-01", "2024-02-01", "SE", ["TON", "SEV"]),
  schedule(2, "C00002", "2024-01-01", "2024-02-01", "SE", ["TON", "SEV"])
];

describe("BuildFeed ordering", () => {

  it("writes the trips in trip ID order", async () => {
    const {files} = await build(new FakeSource(feed()));

    expect(files["trips.txt"].map(t => t.trip_id))
      .to.deep.equal([
        "C00001_20240101_20240201",
        "C00002_20240101_20240201",
        "C00003_20240101_20240301"
      ]);
  });

  it("writes the stop times grouped by trip, in stop sequence", async () => {
    const {files} = await build(new FakeSource(feed()));

    expect(files["stop_times.txt"].map(s => [s.trip_id, s.stop_sequence]))
      .to.deep.equal([
        ["C00001_20240101_20240201", 1], ["C00001_20240101_20240201", 2],
        ["C00002_20240101_20240201", 1], ["C00002_20240101_20240201", 2],
        ["C00003_20240101_20240301", 1], ["C00003_20240101_20240301", 2]
      ]);
  });

  it("numbers the routes from a sort of their name, not from which trip got there first", async () => {
    const {files} = await build(new FakeSource(feed()));

    expect(files["routes.txt"].map(r => [r.route_id, r.route_short_name]))
      .to.deep.equal([
        [1, "SE:TON->SEV:2"],
        [2, "SN:SEV->TON:2"]
      ]);
  });

  it("numbers the services from a sort of the calendar, not from arrival order", async () => {
    const {files} = await build(new FakeSource(feed()));

    // 2024-01-01 to 2024-02-01 sorts before 2024-01-01 to 2024-03-01
    expect(files["calendar.txt"].map(c => [c.service_id, c.start_date, c.end_date]))
      .to.deep.equal([
        [1, "20240101", "20240201"],
        [2, "20240101", "20240301"]
      ]);
  });

  it("points each trip at the service its own calendar was numbered as", async () => {
    const {files} = await build(new FakeSource(feed()));
    const byTrip = Object.fromEntries(files["trips.txt"].map(t => [t.trip_id, t.service_id]));

    expect(byTrip["C00001_20240101_20240201"]).to.equal(1);
    expect(byTrip["C00003_20240101_20240301"]).to.equal(2);
  });

  it("sorts the stops, transfers and links", async () => {
    const {files} = await build(new FakeSource(
      feed(),
      [stop("TON", "TONBDG"), stop("SEV", "SEVNOKS")],
      [transfer("TON", "TON"), transfer("SEV", "SEV")],
      [link("TON", "SEV"), link("SEV", "TON")]
    ));

    // Each station, and the boarding point the calls with no platform are at
    expect(files["stops.txt"].map(s => s.stop_id))
      .to.deep.equal(["9100SEVNOKS", "9100TONBDG", "910GSEVNOKS", "910GTONBDG"]);
    // The two self transfers and the two links, as one file, between stations
    expect(files["transfers.txt"].map(t => [t.from_stop_id, t.to_stop_id]))
      .to.deep.equal([
        ["910GSEVNOKS", "910GSEVNOKS"], ["910GSEVNOKS", "910GTONBDG"],
        ["910GTONBDG", "910GSEVNOKS"], ["910GTONBDG", "910GTONBDG"]
      ]);
    expect(files["links.txt"].map(l => [l.from_stop_id, l.to_stop_id]))
      .to.deep.equal([["SEV", "TON"], ["TON", "SEV"]]);
  });

  it("sorts the agencies", async () => {
    const {files} = await build(new FakeSource(feed()));
    const ids = files["agency.txt"].map(a => a.agency_id);

    expect(ids).to.deep.equal([...ids].sort());
  });

  it("orders rows the declared key leaves tied, rather than leaving them as they arrived", async () => {
    // Two links between the same pair, same mode, same dates, same start time,
    // differing only in the days they run - which is 1,276 rows of the real feed
    const weekday = {...link("TON", "SEV"), saturday: 0 as const, sunday: 0 as const};
    const weekend = {...link("TON", "SEV"), monday: 0 as const, tuesday: 0 as const,
                     wednesday: 0 as const, thursday: 0 as const, friday: 0 as const};

    const forwards = await build(new FakeSource(feed(), [], [], [weekday, weekend]));
    const backwards = await build(new FakeSource(feed(), [], [], [weekend, weekday]));

    expect(backwards.files["links.txt"]).to.deep.equal(forwards.files["links.txt"]);
  });

  it("puts a null ahead of a value rather than wherever it was found", async () => {
    const named = stop("SEV", "SEVNOKS");
    const unnamed = {...stop("XXX", "XXXXXX"), stop_id: null as unknown as string};

    const forwards = await build(new FakeSource(feed(), [named, unnamed]));
    const backwards = await build(new FakeSource(feed(), [unnamed, named]));

    expect(forwards.files["stops.txt"].map(s => s.stop_id))
      .to.deep.equal([null, "9100SEVNOKS", "910GSEVNOKS"]);
    expect(backwards.files["stops.txt"]).to.deep.equal(forwards.files["stops.txt"]);
  });

  it("describes a route the same way whichever of its trips is seen first", async () => {
    // Two trips on one route disagreeing about first class, which 352 routes in
    // the real feed do
    const standard = schedule(1, "C00001", "2024-01-01", "2024-02-01", "SE", ["TON", "SEV"]);
    const first = new Schedule(
      2, standard.stopTimes, "C00002", "", standard.calendar,
      standard.mode, standard.operator, standard.stp, false, false
    );

    const forwards = await build(new FakeSource([standard, first]));
    const backwards = await build(new FakeSource([first, standard]));

    expect(backwards.files["routes.txt"]).to.deep.equal(forwards.files["routes.txt"]);
    expect(forwards.files["routes.txt"].length).to.equal(1);
  });

  it("produces the same feed whatever order the source returns the schedules in", async () => {
    const forwards = await build(new FakeSource(feed()));
    const backwards = await build(new FakeSource(feed().reverse()));

    expect(backwards.files).to.deep.equal(forwards.files);
  });

  it("refuses to write a feed with no schedules in it", async () => {
    await expect(build(new FakeSource([]))).rejects.toThrow(/No schedules run between/);
  });

});

describe("BuildFeed with an enricher", () => {

  /**
   * The seam, exercised end to end. An enricher that only knows about one stop -
   * which is the realistic case, since no external source covers the whole
   * network - and reports the ones it could not place.
   */
  const namer: Enricher<string[]> = {
    key: "TEST_NAMER",
    dependsOn: [],
    priority: 50,
    async fetch() {
      return ["TON", "NOWHERE"];
    },
    apply(feed, known) {
      let matched = 0;
      let unmatched = 0;

      for (const id of known) {
        const target = feed.stop(id);

        if (target) {
          feed.set(target, "stop_name", `${id} renamed`, this);
          matched++;
        }
        else {
          unmatched++;
        }
      }

      return {enricher: this.key, matched, unmatched, conflicts: 0};
    }
  };

  it("changes the feed the enricher touched", async () => {
    const {files} = await build(new FakeSource(feed(), [stop("TON"), stop("SEV")]), [namer]);
    const renamed = files["stops.txt"].find(s => s.stop_id === "TON");

    expect(renamed.stop_name).to.equal("TON renamed");
    expect(files["stops.txt"].find(s => s.stop_id === "SEV").stop_name).to.equal("SEV");
  });

  it("does not put the provenance bookkeeping in stops.txt", async () => {
    const {files} = await build(new FakeSource(feed(), [stop("TON")]), [namer]);

    expect(Object.keys(files["stops.txt"][0])).to.not.contain("located");
  });

  it("records who wrote what, and what the enricher could not place", async () => {
    const {files} = await build(new FakeSource(feed(), [stop("TON"), stop("SEV")]), [namer]);
    const [provenance] = files["provenance.json"];

    expect(provenance.enrichers).to.deep.equal([
      {id: "TEST_NAMER", matched: 1, unmatched: 1, conflicts: 0}
    ]);
    expect(provenance.fields).to.deep.equal([
      {entity: "stop", id: "TON", field: "stop_name", value: "TON renamed", by: "TEST_NAMER", overruled: []}
    ]);
  });

  it("writes no provenance when nothing enriched", async () => {
    const {files} = await build(new FakeSource(feed(), [stop("TON")]));

    expect(files["provenance.json"]).to.equal(undefined);
  });

});
