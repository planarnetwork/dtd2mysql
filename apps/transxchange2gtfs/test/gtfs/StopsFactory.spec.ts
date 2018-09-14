import * as chai from "chai";
import {StopsFactory} from "../../src/gtfs/StopsFactory";

// tslint:disable

describe("StopsFactory", () => {
  const factory = new StopsFactory({
    "a": ["a", "naptanA", "nameA", "streetA", "NE", "townA", "cityA", "1.00", "1.00"],
    "b": ["b", "naptanB", "nameB", "streetB", "NE", "townB", "", "1.00", "1.00"],
    "c": ["c", "naptanC", "nameC Road", "streetC", "NE", "townC", "cityC", "1.00", "1.00"],
    "d": ["d", "naptanD", "nameD", "streetD", "->SW", "townD", "cityD", "1.00", "1.00"],
  });
  it("uses naptan data if it's available", async () => {
    const csv = factory.getStops({
      StopPoints: [{
        StopPointRef: "a",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    } as any);

    const [stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon] = splitCSV(csv.split("\n")[1]);
    chai.expect(stop_id).to.equal("a");
    chai.expect(stop_code).to.equal("naptanA");
    chai.expect(stop_name).to.equal("nameA (NE), streetA, cityA");
    chai.expect(stop_desc).to.equal("nameA");
    chai.expect(stop_lat).to.equal("1.00");
    chai.expect(stop_lon).to.equal("1.00");
  });

  it("uses feed data if NaPTAN location is not found", async () => {
    const csv = factory.getStops({
      StopPoints: [{
        StopPointRef: "NotInIndex",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    } as any);

    const [stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon] = splitCSV(csv.split("\n")[1]);

    chai.expect(stop_id).to.equal("NotInIndex");
    chai.expect(stop_code).to.equal("");
    chai.expect(stop_name).to.equal("name, qualifier");
    chai.expect(stop_desc).to.equal("");
    chai.expect(stop_lat).to.equal("0.00");
    chai.expect(stop_lon).to.equal("0.00");
  });

  it("uses the town if it is city is not present", async () => {
    const csv = factory.getStops({
      StopPoints: [{
        StopPointRef: "b",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    } as any);

    const [stop_id, stop_code, stop_name] = splitCSV(csv.split("\n")[1]);

    chai.expect(stop_id).to.equal("b");
    chai.expect(stop_code).to.equal("naptanB");
    chai.expect(stop_name).to.equal("nameB (NE), streetB, townB");
  });

  it("adds the street name if it is useful", async () => {
    const csv = factory.getStops({
      StopPoints: [{
        StopPointRef: "c",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    } as any);

    const [stop_id, stop_code, stop_name] = splitCSV(csv.split("\n")[1]);

    chai.expect(stop_id).to.equal("c");
    chai.expect(stop_code).to.equal("naptanC");
    chai.expect(stop_name).to.equal("nameC Road (NE), cityC");
  });

  it("removes -> from the indicator", async () => {
    const csv = factory.getStops({
      StopPoints: [{
        StopPointRef: "d",
        CommonName: "name",
        LocalityName: "locality",
        LocalityQualifier: "qualifier"
      }]
    } as any);

    const [stop_id, stop_code, stop_name] = splitCSV(csv.split("\n")[1]);

    chai.expect(stop_id).to.equal("d");
    chai.expect(stop_code).to.equal("naptanD");
    chai.expect(stop_name).to.equal("nameD (SW), streetD, cityD");
  });
});

function splitCSV(csv: string): string[] {
  const row = [];
  let i = 0;

  while (i < csv.length) {
    if (csv.charAt(i) === '"') {
      const endIndex = csv.indexOf('"', i + 1);
      const value = csv.substring(i + 1, endIndex);

      row.push(value);
      i = endIndex + 2;
    }
    else {
      const endIndex = csv.indexOf(',', i);
      const value = csv.substring(i, endIndex);

      row.push(value);
      i = endIndex + 1;
    }
  }

  return row;
}