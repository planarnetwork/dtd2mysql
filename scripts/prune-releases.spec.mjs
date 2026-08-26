import {describe, it, expect} from "vitest";
import {partition} from "./prune-releases.mjs";

const feeds = (...dates) => dates.map(date => `feed-${date}`);

/**
 * A year of dailies, so the monthly keeps can be seen against a real shape.
 */
function everyDay(from, days) {
  const start = new Date(`${from}T00:00:00Z`);

  return Array.from({length: days}, (_, i) => {
    const day = new Date(start.getTime() + i * 86400000);

    return `feed-${day.toISOString().slice(0, 10)}`;
  });
}

describe("partition", () => {

  it("keeps everything while there is little", () => {
    const {keep, remove} = partition(feeds("2026-08-25", "2026-08-26"));

    expect(keep).to.have.length(2);
    expect(remove).to.deep.equal([]);
  });

  it("keeps the most recent 30", () => {
    const {keep} = partition(everyDay("2026-06-01", 120));

    for (const tag of everyDay("2026-09-", 0)) {
      expect(keep).to.contain(tag);
    }

    expect(keep.slice(0, 30)).to.deep.equal(everyDay("2026-08-30", 30).reverse());
  });

  // A month's worth of dailies is not what anybody fetches, but being able to
  // say what the feed looked like in June is worth one release.
  it("keeps the earliest release of every month beyond the recent window", () => {
    const {keep} = partition(everyDay("2026-06-01", 120));

    expect(keep).to.contain("feed-2026-06-01");
    expect(keep).to.contain("feed-2026-07-01");
  });

  // A night that failed to publish must not cost the whole month its record, so
  // it is the earliest release of the month rather than the one dated the 1st.
  it("keeps the earliest release of a month that has no first", () => {
    const {keep} = partition([
      ...feeds("2026-01-03", "2026-01-04", "2026-01-05"),
      ...everyDay("2026-06-01", 40)
    ]);

    expect(keep).to.contain("feed-2026-01-03");
    expect(keep).to.not.contain("feed-2026-01-04");
  });

  it("removes the dailies that are neither recent nor a month's first", () => {
    const {remove} = partition(everyDay("2026-06-01", 120));

    expect(remove).to.contain("feed-2026-06-15");
    expect(remove).to.not.contain("feed-2026-06-01");
  });

  it("keeps and removes every feed release exactly once", () => {
    const all = everyDay("2026-06-01", 120);
    const {keep, remove} = partition(all);

    expect([...keep, ...remove].sort()).to.deep.equal([...all].sort());
  });

  // The npm version tags live in the same release list. A pruner that could
  // reach them is one bad regular expression away from deleting a release of
  // the software.
  it("never touches a tag that is not a feed", () => {
    const {keep, remove} = partition([
      "v6.6.15", "v6.6.14", "latest", "feed-2026-08-26", "feed-nightly", "feed-2026-8-1"
    ]);

    expect(keep).to.deep.equal(["feed-2026-08-26"]);
    expect(remove).to.deep.equal([]);
  });

  it("does nothing with nothing", () => {
    expect(partition([])).to.deep.equal({keep: [], remove: []});
  });

  // Every release is the earliest of its own month until a second one appears,
  // so a naive rule keeps everything forever.
  it("still prunes within a single month", () => {
    const {keep, remove} = partition(everyDay("2026-06-01", 30), 5);

    expect(keep).to.have.length(6);
    expect(remove).to.have.length(24);
    expect(keep).to.contain("feed-2026-06-01");
    expect(keep).to.contain("feed-2026-06-30");
  });

});
