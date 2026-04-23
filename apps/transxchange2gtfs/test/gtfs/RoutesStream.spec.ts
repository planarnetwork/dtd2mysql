import {awaitStream, splitCSV} from "../util";
import {LocalDate} from "@js-joda/core";
import {RoutesStream} from "../../src/gtfs/RoutesStream";


describe("RoutesStream", () => {

  it("emits rail routes with route_type 2", async () => {
    const stream = new RoutesStream();

    stream.write({
      Services: {
        "25-DLR-_-y05-216": {
          "Description": "Bank - Beckton",
          "Lines": { "l_DLR": "DLR" },
          "Mode": "rail",
          "OperatingPeriod": {
            "EndDate": LocalDate.parse("2099-12-31"),
            "StartDate": LocalDate.parse("2018-06-24")
          },
          "RegisteredOperatorRef": "OId_DLR",
          "ServiceCode": "25-DLR-_-y05-216"
        }
      }
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const [route_id, , , , route_type] = splitCSV(rows[1]);

      expect(route_id).to.equal("25-DLR-_-y05-216");
      expect(route_type).to.equal("2");
    });
  });

  it("emits routes", async () => {
    const stream = new RoutesStream();

    stream.write({
      Services: {
        "M6_MEGA": {
          "Description": "Falmouth - Victoria,London",
          "Lines": {
            "l_M6_MEGA": "M6"
          },
          "Mode": "coach",
          "OperatingPeriod": {
            "EndDate": LocalDate.parse("2099-12-31"),
            "StartDate": LocalDate.parse("2018-06-24")
          },
          "RegisteredOperatorRef": "OId_MEGA",
          "ServiceCode": "M6_MEGA"
        }
      }
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const [route_id, agency_id, route_short_name, route_long_name, route_type] = splitCSV(rows[1]);

      expect(route_id).to.equal("M6_MEGA");
      expect(agency_id).to.equal("OId_MEGA");
      expect(route_short_name).to.equal("M6");
      expect(route_long_name).to.equal("Falmouth - Victoria,London");
      expect(route_type).to.equal("3");
    });
  });

});

