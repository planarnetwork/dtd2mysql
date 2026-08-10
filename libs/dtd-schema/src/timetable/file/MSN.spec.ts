import {describe, it, expect} from "vitest";
import MSN from "./MSN";

// Taken from RJTTF001.MSN, which the mini fixture is sliced from. The header is
// the real first line of the file; the fixture holds no footer because the slice
// stops before it.
const header = "A                             FILE-SPEC=05 1.00 04/08/26 18.08.01   920           ";
const station = "A    ABERDEEN                      2ABRDEENABD   ABD13942 68058 5                 ";
const footer = "End of File";

describe("MSN", () => {

  it("does not read the header as a station", () => {
    expect(MSN.getRecord(header)).to.equal(null);
  });

  it("does not read the footer as a record", () => {
    expect(MSN.getRecord(footer)).to.equal(null);
  });

  it("still reads a station", () => {
    expect(MSN.getRecord(station)?.name).to.equal("physical_station");
  });

  it("keeps 9 as an interchange status rather than an absence", () => {
    // 9 is a subsidiary location. IntField's default null characters include it,
    // so a field declared without an explicit list drops these stations out of
    // transfers.txt.
    const subsidiary = station.substring(0, 35) + "9" + station.substring(36);

    expect(MSN.getRecord(subsidiary)!.extractValues(subsidiary).values["cate_interchange_status"])
      .to.equal(9);
  });

  it("treats a blank interchange status as absent", () => {
    const blank = station.substring(0, 35) + " " + station.substring(36);

    expect(MSN.getRecord(blank)!.extractValues(blank).values["cate_interchange_status"])
      .to.equal(null);
  });

});
