import {describe, it, expect} from "vitest";
import {stationCoordinates} from "./station-coordinates";
import {BOUNDS, inBounds} from "../source/Bounds";

/**
 * The override file is 2,594 hand-maintained entries and nothing has ever
 * checked them. TCR had its latitude and longitude the wrong way round, which
 * put Tottenham Court Road in the Indian Ocean, and it went unnoticed because
 * the only way to see it was to plot the feed.
 *
 * The same assertion should carry over to whatever replaces this file.
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

/**
 * What else this file supplies, which its name does not say and nothing checked.
 *
 * `toStop` overlays the whole entry with `Object.assign`, so this is not a
 * coordinates file - it is the source of three of the four fields it carries.
 * D7 reads as "retire station-coordinates.ts now NaPTAN covers 2,580 of 2,594",
 * and NaPTAN covers **only the coordinates**: deleting the file would take the
 * accessibility data and the readable names with it.
 *
 * These assertions exist so that deletion fails here, saying what it costs,
 * rather than showing up as a golden diff somebody rebaselines.
 */
describe("what retiring the file would cost", () => {

  const entries = Object.entries(stationCoordinates);

  // 1,648 fully accessible and 794 partially. B7 left wheelchair_boarding at 0
  // in toStop and this is what puts real values back; D5 was meant to replace
  // it and is blocked on a Rail Data Marketplace credential.
  it("is the only source of station accessibility", () => {
    const known = entries.filter(([, s]) => s.wheelchair_boarding !== 0);

    expect(known.length).to.be.greaterThan(2000);
  });

  // MSN names are upper case and truncated to sixteen characters - NEWCASTLE
  // AIRPRT. NaPTAN has names and deliberately does not supply them, because its
  // CommonName is "Aberdare Rail Station" where the departure boards say
  // "Aberdare".
  it("is the only source of readable station names", () => {
    const readable = entries.filter(([, s]) => s.stop_name !== s.stop_name.toUpperCase());

    expect(readable.length).to.be.greaterThan(2000);
  });

  it("supplies a name for every station it knows", () => {
    const nameless = entries.filter(([, s]) => !s.stop_name).map(([crs]) => crs);

    expect(nameless).to.deep.equal([]);
  });

});
