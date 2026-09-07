import {describe, it, expect} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {eachNaptanRow, parseNaptanRows} from "./NaptanRow";

const CSV = [
  "ATCOCode,CommonName,StopType,Longitude,Latitude",
  "0100BRP90310,Temple Meads,BCT,-2.58113,51.44921",
  "9100ABDARE,Aberdare Rail Station,RLY,-3.44311,51.71361"
].join("\n") + "\n";

describe("parseNaptanRows", () => {

  it("reads rows by column name", () => {
    expect(parseNaptanRows(CSV)[0]).to.deep.equal({
      ATCOCode: "0100BRP90310",
      CommonName: "Temple Meads",
      StopType: "BCT",
      Longitude: "-2.58113",
      Latitude: "51.44921"
    });
  });

  it("applies the filter it is given", () => {
    const rail = parseNaptanRows(CSV, row => row.StopType === "RLY");

    expect(rail.map(r => r.ATCOCode)).to.deep.equal(["9100ABDARE"]);
  });

});

describe("eachNaptanRow", () => {

  it("reads every row of a file, one at a time", async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "naptan")), "naptan.csv");

    fs.writeFileSync(file, CSV);

    const codes: string[] = [];

    await eachNaptanRow(file, row => codes.push(row.ATCOCode!));

    // The whole point of it existing: the national file is 435,000 rows of
    // around forty columns, and parsing it whole to take nine of them costs
    // hundreds of megabytes that reading it as it arrives does not.
    expect(codes).to.deep.equal(["0100BRP90310", "9100ABDARE"]);
  });

  it("reads the same rows as parsing the whole file", async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "naptan")), "naptan.csv");

    fs.writeFileSync(file, CSV);

    const streamed: unknown[] = [];

    await eachNaptanRow(file, row => streamed.push(row));

    expect(streamed).to.deep.equal(parseNaptanRows(CSV));
  });

});
