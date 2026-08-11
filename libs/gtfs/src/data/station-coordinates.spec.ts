import {describe, it, expect} from "vitest";
import {stationCoordinates} from "./station-coordinates";
import {BOUNDS, inBounds} from "../source/Bounds";

/**
 * The override file is 2,594 hand-maintained entries and nothing has ever
 * checked them. TCR had its latitude and longitude the wrong way round, which
 * put Tottenham Court Road in the Indian Ocean, and it went unnoticed because
 * the only way to see it was to plot the feed.
 *
 * The same assertion carries over to overrides.yaml when D7 replaces this file.
 */
describe("stationCoordinates", () => {

  const entries = Object.entries(stationCoordinates);

  it("has an entry to check", () => {
    expect(entries.length).to.be.greaterThan(2000);
  });

  it("puts every station inside the bounds of the feed", () => {
    const outside = entries
      .filter(([, s]) => !inBounds(s.stop_lat as number, s.stop_lon as number))
      .map(([crs, s]) => `${crs} ${s.stop_lat},${s.stop_lon}`);

    expect(outside).to.deep.equal([]);
  });

  it("gives every station a latitude and a longitude", () => {
    const missing = entries
      .filter(([, s]) => typeof s.stop_lat !== "number" || typeof s.stop_lon !== "number")
      .map(([crs]) => crs);

    expect(missing).to.deep.equal([]);
  });

  it("would catch a transposed pair", () => {
    // What TCR held: a London latitude in the longitude and vice versa. The
    // check is only worth having if it fails on this.
    expect(inBounds(-0.1306, 51.5163)).to.equal(false);
    expect(inBounds(51.5163, -0.1306)).to.equal(true);
  });

  it("keeps the bounds tight enough to be worth checking", () => {
    expect(BOUNDS.north - BOUNDS.south).to.be.lessThan(15);
    expect(BOUNDS.east - BOUNDS.west).to.be.lessThan(15);
  });

});
