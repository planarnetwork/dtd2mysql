import {describe, it, expect, vi, afterEach} from "vitest";
import {StationRecord, metresApart, toStop} from "./StationRecord";
import {StationCoordinates} from "./TimetableSource";

/**
 * Bond Street's grid reference, as the MSN gives it: 528,500 east and 181,000
 * north, which is Davies Street.
 */
const bondStreet: StationRecord = {
  crs_code: "BDS",
  tiploc_code: "BONDST",
  station_name: "BOND STREET EL",
  cate_interchange_status: 3,
  easting: 15285,
  northing: 61810
};

function overrides(stop_lat: number, stop_lon: number): StationCoordinates {
  return {
    BDS: {stop_name: "Bond Street (Elizabeth line)", stop_lat, stop_lon, wheelchair_boarding: 0}
  };
}

describe("metresApart", () => {

  it("is zero for the same place", () => {
    expect(metresApart({stop_lat: 51.514, stop_lon: -0.15}, {stop_lat: 51.514, stop_lon: -0.15}))
      .to.equal(0);
  });

  it("measures a degree of latitude", () => {
    const apart = metresApart({stop_lat: 51, stop_lon: -0.15}, {stop_lat: 52, stop_lon: -0.15});

    expect(apart).to.be.greaterThan(110000);
    expect(apart).to.be.lessThan(112000);
  });

  // A degree of longitude is a degree of latitude times the cosine of it, so a
  // measurement that ignores the convergence would call this 111km.
  it("narrows a degree of longitude towards the pole", () => {
    const apart = metresApart({stop_lat: 51.5, stop_lon: 0}, {stop_lat: 51.5, stop_lon: 1});

    expect(apart).to.be.greaterThan(68000);
    expect(apart).to.be.lessThan(70000);
  });

});

describe("toStop", () => {

  afterEach(() => vi.restoreAllMocks());

  it("takes the override, which is surveyed where the grid reference is rounded", () => {
    const stop = toStop(bondStreet, overrides(51.514, -0.15));

    expect(stop.stop_lat).to.equal(51.514);
    expect(stop.stop_lon).to.equal(-0.15);
    expect(stop.located).to.equal(true);
  });

  /**
   * What #187 was: the longitude copied out of "51.514N 0.15W" without its
   * sign, which put Bond Street and both its platforms in Dagenham. Inside the
   * bounds of the feed, so only this catches it.
   */
  it("refuses an override that cannot be describing the same station", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stop = toStop(bondStreet, overrides(51.514, 0.15));

    expect(stop.stop_lon).to.be.closeTo(-0.1496, 0.001);
    expect(stop.stop_lat).to.be.closeTo(51.5133, 0.001);
    expect(warn.mock.calls[0][0]).to.contain("BDS is 21km from where the DTD puts it");
  });

  it("keeps the rest of an override whose coordinate it refused", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(toStop(bondStreet, overrides(51.514, 0.15)).stop_name)
      .to.equal("Bond Street (Elizabeth line)");
  });

  // The DTD locates most stations to within a few hundred metres and some of
  // them, Birmingham New Street among them, to little better than a kilometre.
  // A check that fired on those would be turned off.
  it("allows the disagreement an honest override has", () => {
    const stop = toStop(bondStreet, overrides(51.5, -0.16));

    expect(stop.stop_lat).to.equal(51.5);
    expect(stop.stop_lon).to.equal(-0.16);
  });

  /**
   * The override is the only source for a station the DTD leaves at zeroes, so
   * there is nothing to disagree with and nothing to refuse. Without this the
   * check would throw away the coordinate of every station that most needs one.
   */
  it("takes an override for a station the DTD could not locate", () => {
    const unlocated = {...bondStreet, easting: null, northing: null};
    const stop = toStop(unlocated, overrides(51.514, -0.15));

    expect(stop.stop_lat).to.equal(51.514);
    expect(stop.stop_lon).to.equal(-0.15);
  });

  it("leaves a station with no override where the DTD put it", () => {
    const stop = toStop(bondStreet, {});

    expect(stop.stop_lat).to.be.closeTo(51.5133, 0.001);
    expect(stop.stop_name).to.equal("BOND STREET EL");
  });

});
