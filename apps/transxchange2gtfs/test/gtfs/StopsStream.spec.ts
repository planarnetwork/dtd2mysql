import * as chai from "chai";
import {StopsStream} from "../../src/gtfs/StopsStream";
import {awaitStream, splitCSV} from "../util";

// tslint:disable

describe("StopsStream", () => {
  const naptan = {
    "a": ["a", "naptanA", "nameA", "streetA", "NE", "townA", "cityA", "1.00", "1.00"],
    "b": ["b", "naptanB", "nameB", "streetB", "NE", "townB", "", "1.00", "1.00"],
    "c": ["c", "naptanC", "nameC Road", "streetC", "NE", "townC", "cityC", "1.00", "1.00"],
    "d": ["d", "naptanD", "nameD", "streetD", "->SW", "townD", "cityD", "1.00", "1.00"],
  };

  it("uses naptan data if it's available", async () => {
    const stops = new StopsStream(naptan);
    stops.write({
      StopPoints: [{
        StopPointRef: "a",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    });
    stops.end();

    return awaitStream(stops, (rows: string[]) => {
      const [stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon] = splitCSV(rows[1]);
      chai.expect(stop_id).to.equal("a");
      chai.expect(stop_code).to.equal("naptanA");
      chai.expect(stop_name).to.equal("nameA (NE), streetA, cityA");
      chai.expect(stop_desc).to.equal("nameA");
      chai.expect(stop_lat).to.equal("1.00");
      chai.expect(stop_lon).to.equal("1.00");
    });
  });

  it("uses feed data if NaPTAN location is not found", async () => {
    const stops = new StopsStream(naptan);
    stops.write({
      StopPoints: [{
        StopPointRef: "NotInIndex",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier",
        Location: {
          Latitude: 0.123,
          Longitude: -0.123,
        }
      }]
    });
    stops.end();

    return awaitStream(stops, (rows: string[]) => {
      const [stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon] = splitCSV(rows[1]);

      chai.expect(stop_id).to.equal("NotInIndex");
      chai.expect(stop_code).to.equal("");
      chai.expect(stop_name).to.equal("name, qualifier");
      chai.expect(stop_desc).to.equal("");
      chai.expect(stop_lat).to.equal("0.123");
      chai.expect(stop_lon).to.equal("-0.123");
    });
  });

  it("uses the town if it is city is not present", async () => {
    const stops = new StopsStream(naptan);
    stops.write({
      StopPoints: [{
        StopPointRef: "b",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    });
    stops.end();

    return awaitStream(stops, (rows: string[]) => {
      const [stop_id, stop_code, stop_name] = splitCSV(rows[1]);

      chai.expect(stop_id).to.equal("b");
      chai.expect(stop_code).to.equal("naptanB");
      chai.expect(stop_name).to.equal("nameB (NE), streetB, townB");
    });
  });

  it("adds the street name if it is useful", async () => {
    const stops = new StopsStream(naptan);
    stops.write({
      StopPoints: [{
        StopPointRef: "c",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    });
    stops.end();

    return awaitStream(stops, (rows: string[]) => {
      const [stop_id, stop_code, stop_name] = splitCSV(rows[1]);

      chai.expect(stop_id).to.equal("c");
      chai.expect(stop_code).to.equal("naptanC");
      chai.expect(stop_name).to.equal("nameC Road (NE), cityC");
    });
  });

  it("removes -> from the indicator", async () => {
    const stops = new StopsStream(naptan);
    stops.write({
      StopPoints: [{
        StopPointRef: "d",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    });
    stops.end();

    return awaitStream(stops, (rows: string[]) => {
      const [stop_id, stop_code, stop_name] = splitCSV(rows[1]);

      chai.expect(stop_id).to.equal("d");
      chai.expect(stop_code).to.equal("naptanD");
      chai.expect(stop_name).to.equal("nameD (SW), streetD, cityD");
    });
  });

  it("does not emit the same stop twice", async () => {
    const stops = new StopsStream(naptan);
    stops.write({
      StopPoints: [{
        StopPointRef: "a",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    });
    stops.write({
      StopPoints: [{
        StopPointRef: "a",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    });
    stops.end();

    return awaitStream(stops, (rows: string[]) => {
      chai.expect(rows.length).to.equal(2);
    });
  });

});
