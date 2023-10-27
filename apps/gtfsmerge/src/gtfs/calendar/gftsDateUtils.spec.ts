import * as chai from "chai";
import { toGTFSDate, getDateFromGTFSString } from "./gtfsDateUtils";

describe("toGTFSDate", () => {
  it("returns a GTFS date string", () => {
    const date = new Date("2019-06-04T00:00:00");
    const result = toGTFSDate(date);

    chai.expect(result).to.equal("20190604");
  });
});

describe("getDateFromGTFSString", () => {
  it("returns a JS Date from GTFS string", () => {
    const result = getDateFromGTFSString("20190604");
    const dateDiff = result.getTime() - new Date(2019, 5, 4, 0, 0, 0).getTime();
    chai.expect(dateDiff).to.equal(0);
  });
});

describe("GTFS date roundtrip", () => {
  it("Preserves GTFS dates when converting to/from JS dates", () => {
    function validateGtfsDateRoundtrip(gtfsDate: string) {
      const date = getDateFromGTFSString(gtfsDate);
      const result = toGTFSDate(date);
      chai.expect(result).to.equal(gtfsDate);
    }

    validateGtfsDateRoundtrip("20190601");
    validateGtfsDateRoundtrip("20190604");
    validateGtfsDateRoundtrip("20191231");
    validateGtfsDateRoundtrip("20200101");
  });
});
