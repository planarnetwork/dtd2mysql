import {describe, it, expect} from "vitest";
import {MutableFeed} from "./MutableFeed";
import {enrich, provenanceFile} from "./Enrich";
import {Enricher, EnrichmentReport} from "./Enricher";
import {Stop} from "../entity/Stop";

const stop = (id: string, name = id): Stop => ({
  stop_id: id, stop_code: id, stop_name: name, stop_desc: "", stop_lat: 51, stop_lon: -1,
  zone_id: 0, stop_url: "", location_type: 0, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0, located: true
});

/**
 * An enricher that renames every stop it is given, so a test can watch two of
 * them argue over the same field.
 */
const renamer = (id: string, priority: number, name: string): Enricher => ({
  id,
  priority,
  async enrich(feed: MutableFeed): Promise<EnrichmentReport> {
    let matched = 0;
    let conflicts = 0;

    for (const target of feed.stops) {
      matched++;
      feed.set(target, "stop_name", name, this) || conflicts++;
    }

    return {enricher: id, matched, unmatched: 0, conflicts};
  }
});

const feed = () => new MutableFeed([stop("PAD"), stop("WAT")], [], []);

describe("enrich", () => {

  it("lets the higher priority win", async () => {
    const one = await feed();

    await enrich(one, [renamer("low", 10, "wrong"), renamer("high", 50, "right")]);

    expect(one.stops.map(s => s.stop_name)).to.deep.equal(["right", "right"]);
  });

  it("does not depend on the order the enrichers are listed", async () => {
    // The whole reason priority is declared rather than positional. Order
    // dependence here is the same class of bug as route ids that depended on
    // which trip arrived first.
    const forwards = feed();
    const backwards = feed();

    await enrich(forwards, [renamer("low", 10, "wrong"), renamer("high", 50, "right")]);
    await enrich(backwards, [renamer("high", 50, "right"), renamer("low", 10, "wrong")]);

    expect(forwards.stops.map(s => s.stop_name)).to.deep.equal(backwards.stops.map(s => s.stop_name));
  });

  it("keeps the write that lost", async () => {
    const one = feed();

    await enrich(one, [renamer("low", 10, "wrong"), renamer("high", 50, "right")]);

    const [paddington] = one.ledger.entries().filter(e => e.id === "PAD");

    expect(paddington.value).to.equal("right");
    expect(paddington.by).to.equal("high");
    expect(paddington.overruled).to.deep.equal([{enricher: "low", priority: 10, value: "wrong"}]);
  });

  it("counts a disagreement at equal priority as a conflict", async () => {
    const one = feed();

    await enrich(one, [renamer("a", 50, "one"), renamer("b", 50, "two")]);

    // Two stops, both contested, and no merit to separate the sources on.
    expect(one.ledger.conflicts).to.equal(2);
  });

  it("settles an equal priority the same way every run", async () => {
    const forwards = feed();
    const backwards = feed();

    await enrich(forwards, [renamer("a", 50, "one"), renamer("b", 50, "two")]);
    await enrich(backwards, [renamer("b", 50, "two"), renamer("a", 50, "one")]);

    expect(forwards.stops.map(s => s.stop_name)).to.deep.equal(backwards.stops.map(s => s.stop_name));
  });

  it("does not count agreement as a conflict", async () => {
    const one = feed();

    await enrich(one, [renamer("a", 50, "same"), renamer("b", 50, "same")]);

    expect(one.ledger.conflicts).to.equal(0);
  });

  it("tells an enricher its write did not take", async () => {
    const one = feed();
    const [outranked] = await enrich(one, [renamer("high", 50, "right"), renamer("low", 10, "wrong")])
      .then(reports => reports.filter(r => r.enricher === "low"));

    expect(outranked.conflicts).to.equal(2);
  });

  it("writes a provenance file in a stable order", async () => {
    const one = feed();
    const reports = await enrich(one, [renamer("low", 10, "wrong"), renamer("high", 50, "right")]);
    const file = provenanceFile(one, reports);

    expect(file.fields.map(f => `${f.entity} ${f.id} ${f.field}`))
      .to.deep.equal(["stop PAD stop_name", "stop WAT stop_name"]);
    expect(file.enrichers.map(e => e.id)).to.deep.equal(["high", "low"]);
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
