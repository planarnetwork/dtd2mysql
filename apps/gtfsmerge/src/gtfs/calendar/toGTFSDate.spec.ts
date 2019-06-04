import * as chai from "chai";
import { toGTFSDate } from "./toGTFSDate";

describe("toGTFSDate", () => {

  it("returns a GTFS date string", () => {
    const date = new Date("2019-06-04");
    const result = toGTFSDate(date);

    chai.expect(result).to.equal("20190604");
  });

});
