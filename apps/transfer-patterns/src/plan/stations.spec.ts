import {describe, expect, it} from "vitest";
import {parseShard, shard} from "./stations.js";

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
