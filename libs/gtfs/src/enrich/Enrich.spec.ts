import {describe, it, expect} from "vitest";
import {MutableFeed} from "./MutableFeed";
import {enrich, order, provenanceFile} from "./Enrich";
import {Enricher, EnrichmentReport} from "./Enricher";
import {Stop} from "../entity/Stop";

const stop = (id: string, name = id): Stop => ({
  stop_id: id, stop_code: id, stop_name: name, stop_desc: "", stop_lat: 51, stop_lon: -1,
  zone_id: 0, stop_url: "", location_type: 0, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0, located: true
});

/**
 * Renames every stop, so a test can watch two of them argue over one field.
 */
const renamer = (key: string, priority: number, name: string): Enricher<string> => ({
  key,
  priority,
  dependsOn: [],
  async fetch() {
    return name;
  },
  apply(feed: MutableFeed, data: string): EnrichmentReport {
    let matched = 0;
    let conflicts = 0;

    for (const target of feed.stops) {
      matched++;
      feed.set(target, "stop_name", data, this) || conflicts++;
    }

    return {enricher: key, matched, unmatched: 0, conflicts};
  }
});

/** Records the order applies happened in, so ordering can be asserted. */
const recorder = (key: string, dependsOn: string[], into: string[]): Enricher<null> => ({
  key,
  dependsOn,
  priority: 0,
  async fetch() {
    return null;
  },
  apply(): EnrichmentReport {
    into.push(key);

    return {enricher: key, matched: 0, unmatched: 0, conflicts: 0};
  }
});

const feed = () => new MutableFeed([stop("PAD"), stop("WAT")], [], []);

describe("order", () => {

  it("runs a dependency before the enricher that needs it", () => {
    const ran: string[] = [];
    const sorted = order([
      recorder("PATHWAYS", ["PLATFORMS"], ran),
      recorder("PLATFORMS", [], ran)
    ]);

    expect(sorted.map(e => e.key)).to.deep.equal(["PLATFORMS", "PATHWAYS"]);
  });

  it("resolves a chain", () => {
    const ran: string[] = [];
    const sorted = order([
      recorder("C", ["B"], ran),
      recorder("A", [], ran),
      recorder("B", ["A"], ran)
    ]);

    expect(sorted.map(e => e.key)).to.deep.equal(["A", "B", "C"]);
  });

  it("puts unrelated enrichers in the same order every run", () => {
    // Two enrichers that do not depend on each other could go either way, and
    // "either way" is how a feed ends up depending on how a config was typed.
    const ran: string[] = [];
    const forwards = order([recorder("B", [], ran), recorder("A", [], ran)]);
    const backwards = order([recorder("A", [], ran), recorder("B", [], ran)]);

    expect(forwards.map(e => e.key)).to.deep.equal(backwards.map(e => e.key));
  });

  it("refuses a circle rather than hanging on it", () => {
    const ran: string[] = [];

    expect(() => order([recorder("A", ["B"], ran), recorder("B", ["A"], ran)]))
      .to.throw(/circle: A, B/);
  });

  it("refuses a dependency that is not enabled, and says what is", () => {
    const ran: string[] = [];

    expect(() => order([recorder("OSM", ["NAPTAN"], ran)]))
      .to.throw(/OSM depends on NAPTAN, which is not enabled. Enabled: OSM./);
  });

  it("refuses two enrichers with the same key", () => {
    const ran: string[] = [];

    expect(() => order([recorder("A", [], ran), recorder("A", [], ran)]))
      .to.throw(/Two enrichers both call themselves A/);
  });

});

describe("enrich", () => {

  it("lets the higher priority win", async () => {
    const one = feed();

    await enrich(one, [renamer("LOW", 10, "wrong"), renamer("HIGH", 50, "right")]);

    expect(one.stops.map(s => s.stop_name)).to.deep.equal(["right", "right"]);
  });

  it("does not depend on the order the enrichers are listed", async () => {
    const forwards = feed();
    const backwards = feed();

    await enrich(forwards, [renamer("LOW", 10, "wrong"), renamer("HIGH", 50, "right")]);
    await enrich(backwards, [renamer("HIGH", 50, "right"), renamer("LOW", 10, "wrong")]);

    expect(forwards.stops.map(s => s.stop_name)).to.deep.equal(backwards.stops.map(s => s.stop_name));
  });

  it("applies in dependency order, not priority order", async () => {
    // Priority is about who wins a field, not who goes first. A dependency that
    // is lower priority still has to run before the thing that needs it.
    const ran: string[] = [];
    const first = {...recorder("FIRST", [], ran), priority: 1};
    const second = {...recorder("SECOND", ["FIRST"], ran), priority: 99};

    await enrich(feed(), [second, first]);

    expect(ran).to.deep.equal(["FIRST", "SECOND"]);
  });

  it("fetches every enricher at once", async () => {
    // Twelve enrichers should be one download, not twelve in a queue.
    let running = 0;
    let peak = 0;

    const slow = (key: string): Enricher<null> => ({
      key,
      dependsOn: [],
      priority: 0,
      async fetch() {
        peak = Math.max(peak, ++running);
        await new Promise(resolve => setTimeout(resolve, 20));
        running--;

        return null;
      },
      apply: () => ({enricher: key, matched: 0, unmatched: 0, conflicts: 0})
    });

    await enrich(feed(), [slow("A"), slow("B"), slow("C")]);

    expect(peak).to.equal(3);
  });

  it("says which enricher could not fetch", async () => {
    const broken: Enricher<null> = {
      key: "BROKEN",
      dependsOn: [],
      priority: 0,
      fetch: () => Promise.reject(new Error("502 from the API")),
      apply: () => ({enricher: "BROKEN", matched: 0, unmatched: 0, conflicts: 0})
    };

    await expect(enrich(feed(), [broken])).rejects.toThrow(/BROKEN could not fetch its data: 502/);
  });

  it("keeps the write that lost", async () => {
    const one = feed();

    await enrich(one, [renamer("LOW", 10, "wrong"), renamer("HIGH", 50, "right")]);

    const [paddington] = one.ledger.entries().filter(e => e.id === "PAD");

    expect(paddington.value).to.equal("right");
    expect(paddington.by).to.equal("HIGH");
    expect(paddington.overruled).to.deep.equal([{enricher: "LOW", priority: 10, value: "wrong"}]);
  });

  it("counts a disagreement at equal priority as a conflict", async () => {
    const one = feed();

    await enrich(one, [renamer("A", 50, "one"), renamer("B", 50, "two")]);

    expect(one.ledger.conflicts).to.equal(2);
  });

  it("does not count agreement as a conflict", async () => {
    const one = feed();

    await enrich(one, [renamer("A", 50, "same"), renamer("B", 50, "same")]);

    expect(one.ledger.conflicts).to.equal(0);
  });

  it("tells an enricher its write did not take", async () => {
    const one = feed();
    const reports = await enrich(one, [renamer("HIGH", 50, "right"), renamer("LOW", 10, "wrong")]);
    const [outranked] = reports.filter(r => r.enricher === "LOW");

    expect(outranked.conflicts).to.equal(2);
  });

  it("writes a provenance file in a stable order", async () => {
    const one = feed();
    const reports = await enrich(one, [renamer("LOW", 10, "wrong"), renamer("HIGH", 50, "right")]);
    const file = provenanceFile(one, reports);

    expect(file.fields.map(f => `${f.entity} ${f.id} ${f.field}`))
      .to.deep.equal(["stop PAD stop_name", "stop WAT stop_name"]);
  });

});

describe("MutableFeed", () => {

  it("finds a stop without walking the list", () => {
    expect(feed().stop("WAT")?.stop_id).to.equal("WAT");
    expect(feed().stop("XXX")).to.equal(undefined);
  });

  it("offers the stations without their platforms", () => {
    const platform = {...stop("PAD_1"), parent_station: "PAD"};
    const withPlatform = new MutableFeed([stop("PAD"), platform], [], []);

    expect(withPlatform.stations.map(s => s.stop_id)).to.deep.equal(["PAD"]);
  });

});
