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

  it("sends a repository wide baseline to the repository's own file", () => {
    // Not an app's: a change to the published type surface has nothing to do
    // with cif2gtfs's fixtures, and letting one excuse the other is how a
    // baseline stops meaning anything.
    expect(explainedBy("type-surface.json")).to.equal("BASELINE.md");
    expect(explainedBy(".github/validator-baseline.json")).to.equal("BASELINE.md");
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

  it("does not let an app's entry excuse a repository wide baseline", () => {
    expect(unexplained(["type-surface.json"], [BUS_MD])).to.deep.equal(["type-surface.json"]);
    expect(unexplained(["type-surface.json"], [])).to.deep.equal(["type-surface.json"]);
    expect(unexplained(["type-surface.json"], ["BASELINE.md"])).to.deep.equal([]);
  });

  it("passes when nothing changed", () => {
    expect(unexplained([], [])).to.deep.equal([]);
  });

});
