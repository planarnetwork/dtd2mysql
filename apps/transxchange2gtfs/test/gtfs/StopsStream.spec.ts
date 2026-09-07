import {StopsStream} from "../../src/gtfs/StopsStream";
import {awaitStream, splitCSV} from "../util";


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
      // Expect header to have same number of columns as data rows do
      expect(splitCSV(rows[1])).to.have.lengthOf(splitCSV(rows[0]).length)

      const [stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon] = splitCSV(rows[1]);
      expect(stop_id).to.equal("a");
      expect(stop_code).to.equal("naptanA");
      expect(stop_name).to.equal("nameA (NE), streetA, cityA");
      expect(stop_desc).to.equal("nameA");
      expect(stop_lat).to.equal("1.00");
      expect(stop_lon).to.equal("1.00");
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
      // Expect header to have same number of columns as data rows do
      expect(splitCSV(rows[1])).to.have.lengthOf(splitCSV(rows[0]).length)

      const [stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon] = splitCSV(rows[1]);

      expect(stop_id).to.equal("NotInIndex");
      expect(stop_code).to.equal("");
      expect(stop_name).to.equal("name, qualifier");
      expect(stop_desc).to.equal("");
      expect(stop_lat).to.equal("0.123");
      expect(stop_lon).to.equal("-0.123");
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
      // Expect header to have same number of columns as data rows do
      expect(splitCSV(rows[1])).to.have.lengthOf(splitCSV(rows[0]).length)

      const [stop_id, stop_code, stop_name] = splitCSV(rows[1]);

      expect(stop_id).to.equal("b");
      expect(stop_code).to.equal("naptanB");
      expect(stop_name).to.equal("nameB (NE), streetB, townB");
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
      // Expect header to have same number of columns as data rows do
      expect(splitCSV(rows[1])).to.have.lengthOf(splitCSV(rows[0]).length)

      const [stop_id, stop_code, stop_name] = splitCSV(rows[1]);

      expect(stop_id).to.equal("c");
      expect(stop_code).to.equal("naptanC");
      expect(stop_name).to.equal("nameC Road (NE), cityC");
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
      // Expect header to have same number of columns as data rows do
      expect(splitCSV(rows[1])).to.have.lengthOf(splitCSV(rows[0]).length)

      const [stop_id, stop_code, stop_name] = splitCSV(rows[1]);

      expect(stop_id).to.equal("d");
      expect(stop_code).to.equal("naptanD");
      expect(stop_name).to.equal("nameD (SW), streetD, cityD");
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
      // Expect header to have same number of columns as data rows do
      expect(splitCSV(rows[1])).to.have.lengthOf(splitCSV(rows[0]).length)

      expect(rows.length).to.equal(2);
    });
  });

});
