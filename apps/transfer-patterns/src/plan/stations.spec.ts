import {describe, expect, it} from "vitest";
import {zipSync, strToU8} from "fflate";
import {parseShard, parseWorkers, readStations, shard} from "./stations.js";

/**
 * A feed of nothing but the stops given, which is all `readStations` reads.
 */
function feedOf(...stops: string[]): Uint8Array {
  const header = "stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type," +
    "parent_station,platform_code,stop_timezone";

  return zipSync({"stops.txt": strToU8([header, ...stops].join("\n"))});
}

describe("readStations", () => {
  it("keeps a station and drops the platforms beneath it", async () => {
    expect(await readStations(feedOf(
      "910GNRW,NRW,Norwich,52.6,1.3,1,,,Europe/London",
      "9100NRW1,NRW,Norwich,52.6,1.3,0,910GNRW,1,",
      "9100NRW2,NRW,Norwich,52.6,1.3,0,910GNRW,2,"
    ))).to.deep.equal(["NRW"]);
  });

  it("drops a stop that is not in London's timezone", async () => {
    expect(await readStations(feedOf(
      "910GNRW,NRW,Norwich,52.6,1.3,1,,,Europe/London",
      "PARIS,PAR,Paris Nord,48.9,2.4,1,,,Europe/Paris"
    ))).to.deep.equal(["NRW"]);
  });

  it("drops a stop with no timezone at all", async () => {
    expect(await readStations(feedOf(
      "910GNRW,NRW,Norwich,52.6,1.3,1,,,Europe/London",
      "910GXXX,XXX,Nowhere,52.6,1.3,1,,,"
    ))).to.deep.equal(["NRW"]);
  });

  it("falls back to the stop id where a station has no code", async () => {
    // raptor names its stations the same way, so checkCodeWidths sees this too and stops the run.
    expect(await readStations(feedOf(
      "910GNRW,NRW,Norwich,52.6,1.3,1,,,Europe/London",
      "910GNOCODE,,Anonymous,52.6,1.3,1,,,Europe/London"
    ))).to.deep.equal(["910GNOCODE", "NRW"]);
  });

  it("names a station once, however many stops claim it", async () => {
    expect(await readStations(feedOf(
      "910GNRW,NRW,Norwich,52.6,1.3,1,,,Europe/London",
      "9100NRW,NRW,Norwich,52.6,1.3,1,,,Europe/London"
    ))).to.deep.equal(["NRW"]);
  });

  it("sorts them, so a shard is the same set whatever order the feed listed them in", async () => {
    const forwards = await readStations(feedOf(
      "910GAAA,AAA,A,52.6,1.3,1,,,Europe/London",
      "910GZZZ,ZZZ,Z,52.6,1.3,1,,,Europe/London",
      "910GMMM,MMM,M,52.6,1.3,1,,,Europe/London"
    ));
    const backwards = await readStations(feedOf(
      "910GMMM,MMM,M,52.6,1.3,1,,,Europe/London",
      "910GZZZ,ZZZ,Z,52.6,1.3,1,,,Europe/London",
      "910GAAA,AAA,A,52.6,1.3,1,,,Europe/London"
    ));

    expect(forwards).to.deep.equal(["AAA", "MMM", "ZZZ"]);
    expect(forwards).to.deep.equal(backwards);
  });

  it("has nothing to plan in a feed with no stations", async () => {
    expect(await readStations(feedOf())).to.deep.equal([]);
  });
});

describe("parseWorkers", () => {
  it("reads a count", () => {
    expect(parseWorkers("4")).to.equal(4);
  });

  it("leaves it to the default when not given", () => {
    expect(parseWorkers(undefined)).to.be.undefined;
  });

  it("refuses a count that would plan nothing", () => {
    expect(() => parseWorkers("0")).to.throw("--workers wants a whole number of at least 1");
    expect(() => parseWorkers("-1")).to.throw("--workers wants a whole number of at least 1");
    expect(() => parseWorkers("four")).to.throw("--workers wants a whole number of at least 1");
    expect(() => parseWorkers("")).to.throw("--workers wants a whole number of at least 1");
  });

  it("refuses a fraction rather than quietly rounding it", () => {
    expect(() => parseWorkers("2.5")).to.throw("--workers wants a whole number of at least 1");
  });
});

describe("shard", () => {
  const stations = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"];

  it("gives every station to exactly one shard", () => {
    const of = 3;
    const shards = [1, 2, 3].map(n => shard(stations, n, of));
    const planned = shards.flat().sort();

    expect(planned).to.deep.equal([...stations].sort());
  });

  it("strides rather than blocks, so the big stations are spread", () => {
    expect(shard(stations, 1, 3)).to.deep.equal(["AAA", "DDD", "GGG"]);
    expect(shard(stations, 2, 3)).to.deep.equal(["BBB", "EEE"]);
    expect(shard(stations, 3, 3)).to.deep.equal(["CCC", "FFF"]);
  });

  it("plans everything when there is one shard", () => {
    expect(shard(stations, 1, 1)).to.deep.equal(stations);
  });

  it("gives a shard nothing rather than failing when there are more shards than stations", () => {
    expect(shard(["AAA"], 2, 4)).to.deep.equal([]);
  });

  it("refuses a shard outside the run", () => {
    expect(() => shard(stations, 0, 3)).to.throw("1 <= n <= of");
    expect(() => shard(stations, 4, 3)).to.throw("1 <= n <= of");
  });
});

describe("parseShard", () => {
  it("reads n of of", () => {
    expect(parseShard("2/6")).to.deep.equal({n: 2, of: 6});
  });

  it("plans the whole feed when no shard is given", () => {
    expect(parseShard(undefined)).to.deep.equal({n: 1, of: 1});
  });

  it("refuses something that is not a shard", () => {
    expect(() => parseShard("half")).to.throw("--shard wants <n>/<of>");
  });
});
