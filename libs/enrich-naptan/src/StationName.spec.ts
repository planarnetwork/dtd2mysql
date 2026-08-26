import {describe, it, expect} from "vitest";
import {stationName} from "./StationName";

describe("stationName", () => {

  // The suffix is the whole of D3's objection to taking NaPTAN's names.
  it("removes the suffix the departure boards do not use", () => {
    expect(stationName("Aberdare Rail Station")).to.equal("Aberdare");
    expect(stationName("Ascot Railway Station")).to.equal("Ascot");
    expect(stationName("Cambridge South Station")).to.equal("Cambridge South");
  });

  it("removes a parenthesised suffix", () => {
    expect(stationName("Bushey (Rail Station)")).to.equal("Bushey");
  });

  it("keeps case and punctuation, because this one is published", () => {
    expect(stationName("Birchington-on-Sea Rail Station")).to.equal("Birchington-on-Sea");
    expect(stationName("Acton Bridge (Cheshire) Rail Station")).to.equal("Acton Bridge (Cheshire)");
  });

  it("leaves a name that has no suffix", () => {
    expect(stationName("Aberdare")).to.equal("Aberdare");
  });

  // "Station Road" is a street, not a suffix.
  it("only removes the suffix at the end", () => {
    expect(stationName("Station Road Rail Station")).to.equal("Station Road");
  });

  // A station called only "Rail Station" would otherwise end up nameless, which
  // is worse than the upper case name it already had.
  it("gives back nothing rather than a wrong name", () => {
    expect(stationName("Rail Station")).to.equal("");
  });

});
