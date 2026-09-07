import {describe, it, expect} from "vitest";
import {naptanIndexes} from "./NaPTAN";

const CSV = [
  "ATCOCode,NaptanCode,CommonName,Street,Indicator,LocalityName,ParentLocalityName,Longitude,Latitude",
  "stopA,naptanA,Name A,Street A,NE,Town A,City A,-1.5,53.8",
  "stopB,naptanB,Name B,Street B,SW,Town B,,-1.6,53.9"
].join("\n");

describe("naptanIndexes", () => {

  it("indexes NaPTAN rows by ATCO code, reading columns by name", () => {
    const [byCode] = naptanIndexes(CSV);

    // By name, not by position. The old reader sliced the national CSV at
    // [0,1,4,10,14,18,19,29,30] and would have put a street in the latitude if
    // the DfT ever reordered a column.
    expect(byCode["stopA"]).to.deep.equal({
      atcoCode: "stopA",
      naptanCode: "naptanA",
      name: "Name A",
      street: "Street A",
      indicator: "NE",
      locality: "Town A",
      parentLocality: "City A",
      longitude: "-1.5",
      latitude: "53.8"
    });
  });

  it("indexes by the parent locality, falling back to the locality", () => {
    const [, byLocation] = naptanIndexes(CSV);

    expect(byLocation["City A"]).to.deep.equal(["stopA"]);
    expect(byLocation["Town B"]).to.deep.equal(["stopB"]);
  });

  it("keeps the coordinates as text", () => {
    const [byCode] = naptanIndexes(
      "ATCOCode,Longitude,Latitude\nstopC,-1.50000,53.80000"
    );

    // Through a number, -1.50000 comes back as -1.5 and the feed loses two
    // digits of the precision NaPTAN published.
    expect(byCode["stopC"].longitude).to.equal("-1.50000");
  });

});
