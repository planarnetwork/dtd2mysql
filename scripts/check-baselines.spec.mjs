import {describe, it, expect} from "vitest";
import {explainedBy, unexplained} from "./check-baselines.mjs";

const RAIL = "apps/cif2gtfs/fixtures/mini/golden/stops.txt";
const BUS = "apps/transxchange2gtfs/fixtures/mini/golden/trips.txt";
const RAIL_MD = "apps/cif2gtfs/fixtures/BASELINE.md";
const BUS_MD = "apps/transxchange2gtfs/fixtures/BASELINE.md";

describe("explainedBy", () => {

  it("makes an app answer for its own fixtures", () => {
    expect(explainedBy(RAIL)).to.equal(RAIL_MD);
    expect(explainedBy("apps/gtfsmerge/fixtures/validator-baseline.json"))
      .to.equal("apps/gtfsmerge/fixtures/BASELINE.md");
  });

  it("lets anything answer for a repository wide baseline", () => {
    expect(explainedBy("type-surface.json")).to.equal(null);
    expect(explainedBy(".github/validator-baseline.json")).to.equal(null);
  });

});

describe("unexplained", () => {

  it("passes when the app that moved its golden explained it", () => {
    expect(unexplained([RAIL], [RAIL_MD])).to.deep.equal([]);
  });

  it("fails when nothing was explained", () => {
    expect(unexplained([RAIL], [])).to.deep.equal([RAIL]);
  });

  it("does not let one app's entry excuse another app's golden", () => {
    // The reason this is per app: a note about the bus feed saying nothing
    // about the rail one should not let the rail golden move unread.
    expect(unexplained([RAIL], [BUS_MD])).to.deep.equal([RAIL]);
    expect(unexplained([RAIL, BUS], [BUS_MD])).to.deep.equal([RAIL]);
    expect(unexplained([RAIL, BUS], [RAIL_MD, BUS_MD])).to.deep.equal([]);
  });

  it("accepts any entry for a baseline no app owns", () => {
    expect(unexplained(["type-surface.json"], [BUS_MD])).to.deep.equal([]);
    expect(unexplained(["type-surface.json"], [])).to.deep.equal(["type-surface.json"]);
  });

  it("passes when nothing changed", () => {
    expect(unexplained([], [])).to.deep.equal([]);
  });

});
