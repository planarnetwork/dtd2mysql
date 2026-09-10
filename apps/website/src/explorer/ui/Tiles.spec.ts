import {describe, it, expect} from "vitest";
import {parseLines, unit, zoomFor} from "./Tiles.js";

/**
 * The arithmetic behind the maps.
 *
 * `showMap` and `showLine` themselves build DOM, which is what `test/explorer.browser.mts` opens a
 * browser for. What is testable here is the projection and the zoom, and they are the parts that
 * are wrong in ways nobody sees: a line drawn at one zoom too far in loses its ends off the edge of
 * the box, which looks like a shorter line rather than like a bug.
 */

const BOX = {width: 604, height: 324};

describe("unit", () => {

  it("puts the meridian and the equator in the middle of the world", () => {
    expect(unit(0, 0)).to.deep.equal({x: 0.5, y: 0.5});
  });

  it("puts west of the meridian left of it and north of the equator above it", () => {
    const London = unit(51.5, -0.12);

    expect(London.x).to.be.lessThan(0.5);
    expect(London.y).to.be.lessThan(0.5);
  });

  it("agrees with the tile the world is known to be cut into", () => {
    // Greenwich at zoom 17 is tile x=65535, which is 2^16 - 1: the meridian is the seam between the
    // two halves of the world, so the tile to its west is the last of the first half.
    expect(Math.floor(unit(51.4779, -0.0015).x * 2 ** 17)).to.equal(65535);
  });

});

describe("zoomFor", () => {

  it("zooms out for a longer line", () => {
    const short = zoomFor(0.001, 0.001, BOX);
    const long = zoomFor(0.05, 0.05, BOX);

    expect(long).to.be.lessThan(short);
  });

  /**
   * The failure that would not look like one. A zoom half a level too far in cuts the ends off the
   * line, and what is left is a plausible shorter line.
   */
  it("chooses a zoom the whole span still fits at", () => {
    for (const span of [0.0001, 0.001, 0.01, 0.05, 0.2]) {
      const zoom = zoomFor(span, span, BOX);
      const pixels = span * 256 * 2 ** zoom;

      expect(pixels, `span ${span} at zoom ${zoom}`).to.be.at.most(Math.min(BOX.width, BOX.height));
    }
  });

  it("is bounded by the tallest or widest of the two spans, not the average", () => {
    // Wide and flat: the width is what has to fit, so it gets the same zoom as a square of that width
    expect(zoomFor(0.05, 0.0001, BOX)).to.equal(zoomFor(0.05, 0.05, {...BOX, height: BOX.width}));
  });

  it("does not ask for an infinite zoom for a line that is all in one place", () => {
    expect(Number.isFinite(zoomFor(0, 0, BOX))).to.equal(true);
  });

  it("does not ask for a negative zoom for a line around the planet", () => {
    expect(zoomFor(1, 1, BOX)).to.be.at.least(0);
  });

  it("uses the span that exists when the other is zero", () => {
    // A line due north-south has no width at all, and the height still has to fit
    const zoom = zoomFor(0, 0.01, BOX);

    expect(0.01 * 256 * 2 ** zoom).to.be.at.most(BOX.height);
  });

});

describe("parseLines", () => {

  it("reads a list of lines", () => {
    expect(parseLines("[[[1,2],[3,4]],[[5,6],[7,8]]]"))
      .to.deep.equal([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
  });

  it("reads an empty list", () => {
    expect(parseLines("[]")).to.deep.equal([]);
  });

  /**
   * The bug this exists for. One line passed the way a single line used to be is a flat list of
   * pairs, which by shape alone is a list of two-point lines - so it drew a scatter of stubs and
   * said nothing. Nothing but a browser caught it.
   */
  it("refuses a flat list of pairs, which is one line in the wrong wrapper", () => {
    expect(() => parseLines("[[1,2],[3,4]]")).to.throw(/wrap it in an array/);
  });

  it("refuses a point that is not a pair", () => {
    expect(() => parseLines("[[[1,2,3]]]")).to.throw(/latitude, longitude/);
  });

  it("refuses a coordinate that is not a number", () => {
    expect(() => parseLines("[[[1,\"two\"]]]")).to.throw(/latitude, longitude/);
  });

  it("refuses something that is not a list at all", () => {
    expect(() => parseLines("{}")).to.throw(/array of lines/);
  });

});
