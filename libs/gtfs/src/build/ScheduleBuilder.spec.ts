import {describe, it, expect} from 'vitest';
import {EventEmitter} from "events";
import {ScheduleBuilder} from "../build/ScheduleBuilder";
import {ScheduleStopTimeRow} from "../source/TimetableSource";

/**
 * The schedules query returns a stream of rows, so feed the builder an emitter that behaves
 * like one.
 */
function stream(rows: object[], error?: Error): EventEmitter {
  const emitter = new EventEmitter();

  process.nextTick(() => {
    rows.forEach(row => emitter.emit("result", row));
    error ? emitter.emit("error", error) : emitter.emit("end");
  });

  return emitter;
}

const row = (overrides: object = {}): ScheduleStopTimeRow => (<ScheduleStopTimeRow>Object.assign({
  id: 1,
  train_uid: "C00001",
  retail_train_id: "SR000100",
  runs_from: "2026-08-01",
  runs_to: "2026-12-01",
  monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0,
  stp_indicator: "P",
  crs_code: "TBW",
  train_category: "OO",
  atoc_code: "SE",
  stop_id: 10,
  public_arrival_time: "10:00:00",
  public_departure_time: "10:01:00",
  scheduled_arrival_time: "10:00:00",
  scheduled_departure_time: "10:01:00",
  scheduled_pass_time: null,
  platform: "1",
  activity: "T ",
  train_class: "S",
  reservations: null
}, overrides));

describe("ScheduleBuilder", () => {

  it("loads a schedule with stop times", async () => {
    const builder = new ScheduleBuilder();

    await builder.loadSchedules(stream([
      row({ stop_id: 10, crs_code: "TBW" }),
      row({ stop_id: 11, crs_code: "TON", public_arrival_time: "10:10:00", public_departure_time: "10:11:00" })
    ]));

    expect(builder.results.schedules.length).to.equal(1);
    expect(builder.results.schedules[0].stopTimes.length).to.equal(2);
  });

  /**
   * getSchedules keeps schedules that have no stop times (`stop_time.id IS NULL`), which arrive
   * as a single row with every stop_time column null. Building a stop from one of those used to
   * throw inside the driver's result listener, where the error was swallowed - the query then
   * emitted neither "end" nor "error" and the whole build hung with no output.
   */
  it("loads a schedule that has no stop times", async () => {
    const builder = new ScheduleBuilder();

    await builder.loadSchedules(stream([
      row({
        stop_id: null,
        crs_code: null,
        activity: null,
        platform: null,
        public_arrival_time: null,
        public_departure_time: null,
        scheduled_arrival_time: null,
        scheduled_departure_time: null
      })
    ]));

    expect(builder.results.schedules.length).to.equal(1);
    expect(builder.results.schedules[0].stopTimes.length).to.equal(0);
  });

  it("does not let a schedule without stop times affect the next schedule", async () => {
    const builder = new ScheduleBuilder();

    await builder.loadSchedules(stream([
      row({ id: 1, stop_id: null, crs_code: null, activity: null, public_arrival_time: null, public_departure_time: null, scheduled_arrival_time: null, scheduled_departure_time: null }),
      row({ id: 2, stop_id: 20, crs_code: "TBW" }),
      row({ id: 2, stop_id: 21, crs_code: "TON" })
    ]));

    expect(builder.results.schedules.length).to.equal(2);
    expect(builder.results.schedules[0].stopTimes.length).to.equal(0);
    expect(builder.results.schedules[1].stopTimes.length).to.equal(2);
  });

  it("rejects rather than hanging when a row cannot be processed", async () => {
    const builder = new ScheduleBuilder();
    // a row that claims a stop time but carries no times at all cannot produce a stop
    const promise = builder.loadSchedules(stream([
      row({
        stop_id: 10,
        public_arrival_time: null,
        public_departure_time: null,
        scheduled_arrival_time: null,
        scheduled_departure_time: null
      })
    ]));

    let message = "did not reject";
    try { await promise; } catch (err: any) { message = err.message; }

    expect(message).to.contain("no arrival or departure time");
  });

  it("propagates a stream error", async () => {
    const builder = new ScheduleBuilder();
    let message = "did not reject";

    try { await builder.loadSchedules(stream([], new Error("connection lost"))); }
    catch (err: any) { message = err.message; }

    expect(message).to.equal("connection lost");
  });

});

describe("ScheduleBuilder ordering contract", () => {

  it("builds the same schedules from an iterable as from a stream", async () => {
    const rows = [
      row({ id: 1, stop_id: 10, crs_code: "TBW" }),
      row({ id: 1, stop_id: 11, crs_code: "TON" }),
      row({ id: 2, train_uid: "C00002", stop_id: 12, crs_code: "SEV" }),
      row({ id: 2, train_uid: "C00002", stop_id: 13, crs_code: "ORP" })
    ];

    const streamed = new ScheduleBuilder();
    await streamed.loadSchedules(stream(rows));

    const iterated = new ScheduleBuilder();
    iterated.load(rows);

    expect(iterated.results.schedules.map(s => [s.id, s.tuid, s.stopTimes.length]))
      .to.deep.equal(streamed.results.schedules.map(s => [s.id, s.tuid, s.stopTimes.length]));
  });

  it("keeps two concurrent loads from splicing stops into each other's trains", async () => {
    // The MySQL source loads passenger schedules and z-trains into one builder at
    // the same time. Rows from the two queries arrive interleaved.
    const builder = new ScheduleBuilder();

    await Promise.all([
      builder.loadSchedules(stream([
        row({ id: 1, stop_id: 10, crs_code: "TBW" }),
        row({ id: 1, stop_id: 11, crs_code: "TON" })
      ])),
      builder.loadSchedules(stream([
        row({ id: 500, train_uid: "Z00001", stop_id: 20, crs_code: "SEV" }),
        row({ id: 500, train_uid: "Z00001", stop_id: 21, crs_code: "ORP" })
      ]))
    ]);

    const byId = new Map(builder.results.schedules.map(s => [s.id, s]));

    expect(byId.get(1)!.stopTimes.map(s => s.stop_id)).to.deep.equal(["TBW", "TON"]);
    expect(byId.get(500)!.stopTimes.map(s => s.stop_id)).to.deep.equal(["SEV", "ORP"]);
  });

  it("numbers stop times in the order the rows arrive", () => {
    const builder = new ScheduleBuilder();

    builder.load([
      row({ id: 1, stop_id: 10, crs_code: "TBW" }),
      row({ id: 1, stop_id: 11, crs_code: "TON" }),
      row({ id: 1, stop_id: 12, crs_code: "SEV" })
    ]);

    expect(builder.results.schedules[0].stopTimes.map(s => s.stop_sequence)).to.deep.equal([1, 2, 3]);
  });

  it("starts a new schedule whenever the id changes, so an unsorted source produces duplicates", () => {
    const builder = new ScheduleBuilder();

    builder.load([
      row({ id: 1, stop_id: 10, crs_code: "TBW" }),
      row({ id: 2, train_uid: "C00002", stop_id: 12, crs_code: "SEV" }),
      row({ id: 1, stop_id: 11, crs_code: "TON" })
    ]);

    // Three schedules from two ids: this is why the ordering is part of the contract
    expect(builder.results.schedules.map(s => s.id)).to.deep.equal([1, 2, 1]);
  });

});

/**
 * A row only reaches the builder with a pass time when the build asked to keep
 * the locations a service runs through. The source decides whether to send one;
 * what one becomes is decided here.
 */
describe("a passing point", () => {

  // What the CIF gives for one: a pass time, no arrival and no departure of
  // either kind, a blank activity and the running line it takes through.
  const passing = (overrides: object = {}) => row({
    public_arrival_time: null,
    public_departure_time: null,
    scheduled_arrival_time: null,
    scheduled_departure_time: null,
    scheduled_pass_time: "10:05:00",
    activity: "  ",
    ...overrides
  });

  it("takes the pass time as both its arrival and its departure", () => {
    const builder = new ScheduleBuilder();

    builder.load([row({stop_id: 10, crs_code: "TBW"}), passing({stop_id: 11, crs_code: "TON"})]);

    const [, through] = builder.results.schedules[0].stopTimes;

    expect(through.arrival_time).to.equal("10:05:00");
    expect(through.departure_time).to.equal("10:05:00");
  });

  it("is a call nobody boards or alights at", () => {
    const builder = new ScheduleBuilder();

    builder.load([row({stop_id: 10, crs_code: "TBW"}), passing({stop_id: 11, crs_code: "TON"})]);

    const [, through] = builder.results.schedules[0].stopTimes;

    expect(through.pickup_type).to.equal(1);
    expect(through.drop_off_type).to.equal(1);
  });

  /**
   * The platform on a pass record is the line the service takes through the
   * station, not somewhere a passenger can stand. Keeping it would put a
   * boarding point in stops.txt for a fast line nothing calls at.
   */
  it("names the station rather than the line it runs through on", () => {
    const builder = new ScheduleBuilder();

    builder.load([row({stop_id: 10, crs_code: "TBW"}), passing({stop_id: 11, crs_code: "TON", platform: "4"})]);

    const [, through] = builder.results.schedules[0].stopTimes;

    expect(through.platform).to.equal(null);
  });

  it("rolls over midnight the same way a call does", () => {
    const builder = new ScheduleBuilder();

    builder.load([
      row({stop_id: 10, crs_code: "TBW", public_arrival_time: "23:00:00", public_departure_time: "23:01:00"}),
      passing({stop_id: 11, crs_code: "TON", scheduled_pass_time: "00:05:00"})
    ]);

    expect(builder.results.schedules[0].stopTimes[1].arrival_time).to.equal("24:05:00");
  });

  /**
   * Two of a service's timing points can share a CRS - a station and the
   * junction on its approach - and the one it stops at is the one that belongs
   * in the feed.
   */
  it("gives way to a call at the same station", () => {
    const builder = new ScheduleBuilder();

    builder.load([
      row({stop_id: 10, crs_code: "TBW"}),
      passing({stop_id: 11, crs_code: "TON"}),
      row({stop_id: 12, crs_code: "TON", public_arrival_time: "10:06:00", public_departure_time: "10:07:00"})
    ]);

    const stops = builder.results.schedules[0].stopTimes;

    expect(stops.map(s => s.stop_id)).to.deep.equal(["TBW", "TON"]);
    expect(stops[1].arrival_time).to.equal("10:06:00");
    expect(stops[1].pickup_type).to.equal(0);
  });

  /**
   * A request stop boards on request, so it is pickup_type 3 rather than 0 and
   * has no 0 to win the station with. 28 of them lost it to the point the
   * service passes on the way in.
   */
  it("gives way to a request stop at the same station", () => {
    const builder = new ScheduleBuilder();

    builder.load([
      row({stop_id: 10, crs_code: "TBW"}),
      passing({stop_id: 11, crs_code: "TON"}),
      row({stop_id: 12, crs_code: "TON", activity: "R ", public_arrival_time: "10:06:00",
           public_departure_time: "10:07:00"})
    ]);

    const stops = builder.results.schedules[0].stopTimes;

    expect(stops.map(s => s.stop_id)).to.deep.equal(["TBW", "TON"]);
    expect(stops[1].pickup_type).to.equal(3);
    expect(stops[1].drop_off_type).to.equal(3);
  });

  it("does not take a station back off a call it already gave way to", () => {
    const builder = new ScheduleBuilder();

    builder.load([
      row({stop_id: 10, crs_code: "TBW"}),
      passing({stop_id: 11, crs_code: "TON"}),
      row({stop_id: 12, crs_code: "TON", public_arrival_time: "10:06:00", public_departure_time: "10:07:00"}),
      passing({stop_id: 13, crs_code: "TON", scheduled_pass_time: "10:08:00"})
    ]);

    const stops = builder.results.schedules[0].stopTimes;

    expect(stops.map(s => s.stop_id)).to.deep.equal(["TBW", "TON"]);
    expect(stops[1].arrival_time).to.equal("10:06:00");
  });

});
