import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {LocalDate} from "js-joda";
import {RoutesStream} from "../../src/gtfs/RoutesStream";

// tslint:disable

describe("RoutesStream", () => {

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

      chai.expect(route_id).to.equal("M6_MEGA");
      chai.expect(agency_id).to.equal("OId_MEGA");
      chai.expect(route_short_name).to.equal("M6_MEGA");
      chai.expect(route_long_name).to.equal("Falmouth - Victoria,London");
      chai.expect(route_type).to.equal("3");
    });
  });

});

