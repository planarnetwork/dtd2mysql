import {awaitStream, splitCSV} from "../util";
import {StopTimesStream} from "../../src/gtfs/StopTimesStream";


describe("StopTimesStream", () => {

  it("emits stop times", async () => {
    const stream = new StopTimesStream();

    stream.write({
      trip: {
        id: 2,
        headsign: "G153"
      },
      stops: [
        { stop: "A", "arrivalTime": "10:00", departureTime: "10:00", dropoff: false, pickup: true, exactTime: true, shapeDistTraveled: "" },
        { stop: "B", "arrivalTime": "11:00", departureTime: "11:10", dropoff: true, pickup: true, exactTime: true, shapeDistTraveled: "" },
        { stop: "C", "arrivalTime": "12:00", departureTime: "12:00", dropoff: true, pickup: false, exactTime: true, shapeDistTraveled: "" },
      ]
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      let [trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint] = splitCSV(rows[1]);

      expect(trip_id).to.equal("2");
      expect(arrival_time).to.equal("10:00");
      expect(departure_time).to.equal("10:00");
      expect(stop_id).to.equal("A");
      expect(stop_sequence).to.equal("1");
      expect(stop_headsign).to.equal("");
      expect(pickup_type).to.equal("0");
      expect(drop_off_type).to.equal("1");
      expect(shape_dist_traveled).to.equal("");
      expect(timepoint).to.equal("1");

      [trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint] = splitCSV(rows[2]);

      expect(trip_id).to.equal("2");
      expect(arrival_time).to.equal("11:00");
      expect(departure_time).to.equal("11:10");
      expect(stop_id).to.equal("B");
      expect(stop_sequence).to.equal("2");
      expect(stop_headsign).to.equal("");
      expect(pickup_type).to.equal("0");
      expect(drop_off_type).to.equal("0");
      expect(shape_dist_traveled).to.equal("");
      expect(timepoint).to.equal("1");

      [trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint] = splitCSV(rows[3]);

      expect(trip_id).to.equal("2");
      expect(arrival_time).to.equal("12:00");
      expect(departure_time).to.equal("12:00");
      expect(stop_id).to.equal("C");
      expect(stop_sequence).to.equal("3");
      expect(stop_headsign).to.equal("");
      expect(pickup_type).to.equal("1");
      expect(drop_off_type).to.equal("0");
      expect(shape_dist_traveled).to.equal("");
      expect(timepoint).to.equal("1");
    });
  });

});

