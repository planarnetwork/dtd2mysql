import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {StopTimesStream} from "../../src/gtfs/StopTimesStream";

// tslint:disable

describe("StopTimesStream", () => {

  it("emits stop times", async () => {
    const stream = new StopTimesStream();

    stream.write({
      trip: {
        id: 2,
        headsign: "G153"
      },
      stops: [
        { stop: "A", "arrivalTime": "10:00", departureTime: "10:00", dropoff: false, pickup: true },
        { stop: "B", "arrivalTime": "11:00", departureTime: "11:10", dropoff: true, pickup: true },
        { stop: "C", "arrivalTime": "12:00", departureTime: "12:00", dropoff: true, pickup: false },
      ]
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      let [trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint] = splitCSV(rows[1]);

      chai.expect(trip_id).to.equal("2");
      chai.expect(arrival_time).to.equal("10:00");
      chai.expect(departure_time).to.equal("10:00");
      chai.expect(stop_id).to.equal("A");
      chai.expect(stop_sequence).to.equal("1");
      chai.expect(stop_headsign).to.equal("");
      chai.expect(pickup_type).to.equal("0");
      chai.expect(drop_off_type).to.equal("1");
      chai.expect(shape_dist_traveled).to.equal("");
      chai.expect(timepoint).to.equal("1");

      [trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint] = splitCSV(rows[2]);

      chai.expect(trip_id).to.equal("2");
      chai.expect(arrival_time).to.equal("11:00");
      chai.expect(departure_time).to.equal("11:10");
      chai.expect(stop_id).to.equal("B");
      chai.expect(stop_sequence).to.equal("2");
      chai.expect(stop_headsign).to.equal("");
      chai.expect(pickup_type).to.equal("0");
      chai.expect(drop_off_type).to.equal("0");
      chai.expect(shape_dist_traveled).to.equal("");
      chai.expect(timepoint).to.equal("1");

      [trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint] = splitCSV(rows[3]);

      chai.expect(trip_id).to.equal("2");
      chai.expect(arrival_time).to.equal("12:00");
      chai.expect(departure_time).to.equal("12:00");
      chai.expect(stop_id).to.equal("C");
      chai.expect(stop_sequence).to.equal("3");
      chai.expect(stop_headsign).to.equal("");
      chai.expect(pickup_type).to.equal("1");
      chai.expect(drop_off_type).to.equal("0");
      chai.expect(shape_dist_traveled).to.equal("");
      chai.expect(timepoint).to.equal("1");
    });
  });

});

