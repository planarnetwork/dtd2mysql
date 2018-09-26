import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {LocalDate} from "js-joda";
import {TripsStream} from "../../src/gtfs/TripsStream";

// tslint:disable

describe("TripsStream", () => {

  it("emits calendar trips", async () => {
    const stream = new TripsStream();

    stream.write({
      calendar: {
        id: 3,
        startDate: LocalDate.parse("2018-06-24"),
        endDate: LocalDate.parse("2099-12-31"),
        days: [1, 1, 1, 1, 1, 1, 1],
        includes: [LocalDate.parse("2018-06-01")],
        excludes: [LocalDate.parse("2018-12-25")]
      },
      trip: {
        id: 2,
        headsign: "G153"
      },
      route: 1
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const [route_id, service_id, trip_id, trip_headsign, trip_short_name, direction_id, wheelchair_accessible, bikes_allowed] = splitCSV(rows[1]);

      chai.expect(route_id).to.equal("1");
      chai.expect(service_id).to.equal("3");
      chai.expect(trip_id).to.equal("2");
      chai.expect(trip_headsign).to.equal("G153");
      chai.expect(trip_short_name).to.equal("G153");
      chai.expect(direction_id).to.equal("0");
      chai.expect(wheelchair_accessible).to.equal("0");
      chai.expect(bikes_allowed).to.equal("0");
    });
  });

});

