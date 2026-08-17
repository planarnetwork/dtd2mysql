import {describe, it, expect} from "vitest";
import {parseNaptan} from "./NaptanSource";

const header = "ATCOCode,CommonName,LocalityName,Longitude,Latitude,StopType,Status";
const csv = (...rows: string[]) => [header, ...rows].join("\n") + "\n";

describe("parseNaptan", () => {

  it("reads a rail station, keyed on the TIPLOC inside the ATCO code", () => {
    const [stop] = parseNaptan(csv("9100ABDARE,Aberdare Rail Station,Aberdare,-3.443,51.715,RLY,active"));

    expect(stop).to.deep.equal({
      tiploc: "ABDARE",
      name: "Aberdare Rail Station",
      latitude: 51.715,
      longitude: -3.443,
      locality: "Aberdare",
      active: true
    });
  });

  it("ignores everything that is not a railway station", () => {
    expect(parseNaptan(csv(
      "490000001,A bus stop,Somewhere,-0.1,51.5,BCT,active",
      "9400ZZLUACT1,Acton Town,London,-0.28,51.50,MET,active"
    ))).to.deep.equal([]);
  });

  it("drops a record whose position is blank", () => {
    // NaPTAN carries rail records with no coordinate - Bond Street and
    // Tottenham Court Road among them. Number("") is 0, so an empty field that
    // reaches the conversion puts a London station in the Gulf of Guinea.
    expect(parseNaptan(csv("9100BONDST,Bond Street,London,,,RLY,active"))).to.deep.equal([]);
  });

  it("drops a record whose position is not a number", () => {
    expect(parseNaptan(csv("9100NOWHERE,Nowhere,Nowhere,east,north,RLY,active"))).to.deep.equal([]);
  });

  it("notices an inactive record rather than hiding it", () => {
    const [stop] = parseNaptan(csv("9100OLDSTN,Old Station,Somewhere,-1,52,RLY,inactive"));

    expect(stop.active).to.equal(false);
  });

});
