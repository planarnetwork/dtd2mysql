import * as chai from "chai";
import moment = require("moment");
import {Days, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";
import {Schedule, STP, TUID} from "../../../src/gtfs/native/Schedule";
import {RouteType} from "../../../src/gtfs/file/Route";

describe("Schedule", () => {

  it("applies an overlay that doesn't overlap", () => {
    const perm = schedule("A", "2017-01-01", "2017-01-31");
    const nolay = schedule("A", "2017-02-05", "2017-02-07");

    const [s1] = perm.applyOverlay(nolay, mockIdGenerator());

    chai.expect(s1).to.equal(perm);
  });

  it("applies a short overlay", () => {
    const perm = schedule("A", "2017-01-01", "2017-01-31");
    const short = schedule("A", "2017-01-05", "2017-01-07");

    const [s1] = perm.applyOverlay(short, mockIdGenerator());

    chai.expect(s1).not.to.equal(perm);
    chai.expect(s1.tuid).to.equal(perm.tuid);
  });

  it("applies a long overlay", () => {
    const perm = schedule("A", "2017-01-01", "2017-01-31");
    const long = schedule("A", "2017-01-02", "2017-01-30");

    const [s1, s2, s3] = perm.applyOverlay(long, mockIdGenerator());

    chai.expect(s1).not.to.equal(perm);
    chai.expect(s1.tuid).to.equal(perm.tuid);
    chai.expect(s1.id).to.be.greaterThan(perm.id);
    chai.expect(s2).not.to.equal(perm);
    chai.expect(s2.tuid).to.equal(perm.tuid);
    chai.expect(s2.id).to.greaterThan(perm.id);
    chai.expect(s3).to.be.undefined;
  });

});

function* mockIdGenerator() {
  let id = 100;
  while (true) {
    yield id++;
  }
}

function schedule(tuid: TUID, from: string, to: string, days: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }): Schedule {
  return new Schedule(
    0,
    [],
    tuid,
    "",
    new ScheduleCalendar(
      moment(from),
      moment(to),
      days,
      {}
    ),
    RouteType.Rail,
    "LN",
    STP.Permanent
  );
}