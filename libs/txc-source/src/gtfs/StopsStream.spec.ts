import {StopsStream} from "./StopsStream";
import {describe, it, expect} from "vitest";
import {awaitStream} from "../testing/util";


describe("StopsStream", () => {
  const stop = (
    atcoCode: string, naptanCode: string, name: string, street: string, indicator: string,
    locality: string, parentLocality: string
  ) => ({
    atcoCode, naptanCode, name, street, indicator, locality, parentLocality,
    longitude: "1.00", latitude: "1.00"
  });

  const naptan = {
    "a": stop("a", "naptanA", "nameA", "streetA", "NE", "townA", "cityA"),
    "b": stop("b", "naptanB", "nameB", "streetB", "NE", "townB", ""),
    "c": stop("c", "naptanC", "nameC Road", "streetC", "NE", "townC", "cityC"),
    "d": stop("d", "naptanD", "nameD", "streetD", "->SW", "townD", "cityD"),
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

    return awaitStream(stops, (rows: any[]) => {
      const {stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon} = rows[0];
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

    return awaitStream(stops, (rows: any[]) => {
      const {stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon} = rows[0];

      expect(stop_id).to.equal("NotInIndex");
      expect(stop_code).to.equal("");
      expect(stop_name).to.equal("name, qualifier");
      expect(stop_desc).to.equal("");
      expect(stop_lat).to.equal(0.123);
      expect(stop_lon).to.equal(-0.123);
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

    return awaitStream(stops, (rows: any[]) => {
      const {stop_id, stop_code, stop_name} = rows[0];

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

    return awaitStream(stops, (rows: any[]) => {
      const {stop_id, stop_code, stop_name} = rows[0];

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

    return awaitStream(stops, (rows: any[]) => {
      const {stop_id, stop_code, stop_name} = rows[0];

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

    return awaitStream(stops, (rows: any[]) => {
      expect(rows.length).to.equal(1);
    });
  });

});
