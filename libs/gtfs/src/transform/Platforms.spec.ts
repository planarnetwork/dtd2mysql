import {describe, it, expect} from "vitest";
import {platformStop, station} from "./Platforms";

describe("platformStop", () => {

  it("makes a child stop of a numbered platform", () => {
    expect(platformStop("PAD", "1")).to.equal("PAD_1");
    expect(platformStop("WAT", "13")).to.equal("WAT_13");
  });

  it("makes a child stop of a lettered platform", () => {
    expect(platformStop("PAD", "A")).to.equal("PAD_A");
    expect(platformStop("PAD", "3A")).to.equal("PAD_3A");
  });

  it("leaves a call at the station when no platform is given", () => {
    expect(platformStop("PAD", null)).to.equal("PAD");
    expect(platformStop("PAD", "")).to.equal("PAD");
  });

  it("leaves a call at the station when the value is a running line", () => {
    // DF is Down Fast, UM Up Main, DPL Down Platform Loop. They say which track
    // the train takes, not where a passenger stands, and 45 of the 3,750
    // station-platform pairs in the feed are these.
    for (const line of ["DF", "UM", "DM", "DPL", "UGL", "SGL", "TL", "UWB"]) {
      expect(platformStop("PAD", line)).to.equal("PAD");
    }
  });

  it("leaves BAY at the station, which is a real designation and a known loss", () => {
    expect(platformStop("PAD", "BAY")).to.equal("PAD");
  });

});

describe("station", () => {

  it("finds the station a platform belongs to", () => {
    expect(station("PAD_A")).to.equal("PAD");
    expect(station("WAT_13")).to.equal("WAT");
  });

  it("leaves a station alone", () => {
    expect(station("PAD")).to.equal("PAD");
  });

});
