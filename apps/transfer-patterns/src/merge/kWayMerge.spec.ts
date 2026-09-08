import {describe, expect, it} from "vitest";
import {kWayMerge} from "./kWayMerge.js";

async function* from(patterns: string[][]): AsyncGenerator<string[]> {
  for (const pattern of patterns) {
    yield pattern;
  }
}

async function collect(sources: string[][][]): Promise<string[][]> {
  const merged: string[][] = [];

  for await (const pattern of kWayMerge(sources.map(from))) {
    merged.push(pattern);
  }

  return merged;
}

describe("kWayMerge", () => {
  it("interleaves sorted sources", async () => {
    const merged = await collect([
      [["AAA"], ["CCC"], ["EEE"]],
      [["BBB"], ["DDD"], ["FFF"]]
    ]);

    expect(merged).to.deep.equal([["AAA"], ["BBB"], ["CCC"], ["DDD"], ["EEE"], ["FFF"]]);
  });

  it("keeps one copy of a pattern two shards both found", async () => {
    const merged = await collect([
      [["LST", "NRW"]],
      [["LST", "NRW"]],
      [["LST", "NRW"]]
    ]);

    expect(merged).to.deep.equal([["LST", "NRW"]]);
  });

  it("sorts on the joined codes, not on the stations one at a time", async () => {
    // "LSTCBG" < "LSTCB" is false, but ["LST","CBG"] vs ["LST","CB"] compared station by station
    // would put the shorter first. The line is what was sorted, so the line is what is compared.
    const merged = await collect([
      [["LSTA", "AAA"]],
      [["LST", "ZAAA"]]
    ]);

    expect(merged.map(p => p.join(""))).to.deep.equal(["LSTAAAA", "LSTZAAA"]);
  });

  it("keeps a pattern that another pattern runs through", async () => {
    // LST CBG NRW is both a pattern and the start of LST CBG ELY NRW. Every line is one pattern,
    // so the longer one must not swallow the shorter.
    const merged = await collect([
      [["LST", "CBG", "NRW"], ["LST", "CBG", "ELY", "NRW"]]
    ]);

    expect(merged).to.have.lengthOf(2);
  });

  it("drains a source that outlives the others", async () => {
    const merged = await collect([
      [["AAA"]],
      [["BBB"], ["CCC"], ["DDD"]]
    ]);

    expect(merged).to.deep.equal([["AAA"], ["BBB"], ["CCC"], ["DDD"]]);
  });

  it("has nothing to say about no sources, or empty ones", async () => {
    expect(await collect([])).to.deep.equal([]);
    expect(await collect([[], []])).to.deep.equal([]);
  });
});
