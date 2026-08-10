import {describe, it, expect} from "vitest";
import {isPlaceholder, withoutPlaceholders} from "./Placeholder";
import {Stop} from "../entity/Stop";

const stop = (id: string, code: string, name: string, lat: number | null, lon: number | null) => ({
  stop_id: id,
  stop_code: code,
  stop_name: name,
  stop_lat: lat,
  stop_lon: lon
}) as Stop;

// As they appear in the feed today: a CATZ TIPLOC and no usable coordinate,
// because eastings of 18999 and 19500 unwind past the edge of the National Grid.
const placeholder = stop("QXO", "CATZQXO", "XC ORIGIN", null, null);
const transpennine = stop("QTD", "CATZQTD", "TRANSPENNINE DESTINATION", null, null);

describe("isPlaceholder", () => {

  it("matches an operator origin", () => {
    expect(isPlaceholder(placeholder)).to.equal(true);
  });

  it("matches the longest operator name in the set", () => {
    expect(isPlaceholder(transpennine)).to.equal(true);
  });

  it("spares a real station that only has a CATZ TIPLOC", () => {
    // 121 stations have one, most of them real CIE stations, and those have no
    // coordinate either - so they match two of the three signals and have to
    // survive on the name.
    const attymon = stop("ATM", "CATZATM", "ATTYMON     (CIE", null, null);

    expect(isPlaceholder(attymon)).to.equal(false);
  });

  it("spares a real station that is only outside the bounds", () => {
    const hoekVanHolland = stop("HVH", "HOEKVHL", "HOEK VAN HOLLAND", 51.9978, 4.12617);

    expect(isPlaceholder(hoekVanHolland)).to.equal(false);
  });

  it("spares a real station whose CRS starts with Q", () => {
    // 38 do. A Q prefix is not evidence of anything.
    const queensPark = stop("QPW", "QPRKWLJ", "Queens Park", 51.53401, -0.20464);

    expect(isPlaceholder(queensPark)).to.equal(false);
  });

  it("spares a station that has a coordinate however it is named", () => {
    const located = stop("QXO", "CATZQXO", "XC ORIGIN", 53.4, -1.5);

    expect(isPlaceholder(located)).to.equal(false);
  });

});

describe("withoutPlaceholders", () => {

  it("keeps the real stops and reports the codes of the rest", () => {
    const real = stop("WAT", "WATRLOO", "London Waterloo", 51.5031, -0.1132);
    const {stops, dropped} = withoutPlaceholders([real, placeholder]);

    expect(stops).to.deep.equal([real]);
    expect([...dropped]).to.deep.equal(["QXO"]);
  });

});
