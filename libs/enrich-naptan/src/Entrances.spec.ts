import {describe, it, expect} from "vitest";
import {MutableFeed} from "@gb-transit/gtfs";
import type {Stop} from "@gb-transit/gtfs";
import {NaptanEntranceEnricher, describe as describeEntrance, metresBetween, normalise} from "./Entrances";
import {NaptanEntrance} from "./Naptan";

const station = (crs: string, name: string, lat = 51.5, lon = -0.1): Stop => ({
  stop_id: `910G${crs}`, crs, tiploc: crs, stop_name: name, stop_desc: "", stop_lat: lat,
  stop_lon: lon, zone_id: 0, stop_url: "", location_type: 1, parent_station: null,
  platform_code: null, stop_timezone: "Europe/London", wheelchair_boarding: 2, located: true
});

const entrance = (atco: string, name: string, lat = 51.5, lon = -0.1): NaptanEntrance => ({
  atco, name, latitude: lat, longitude: lon, indicator: "", street: "", active: true
});

const run = (stations: Stop[], entrances: NaptanEntrance[], maxMetres?: number) => {
  const feed = new MutableFeed(stations, [], []);
  const enricher = new NaptanEntranceEnricher(
    () => Promise.resolve(entrances), 50, maxMetres
  );

  return {feed, report: enricher.apply(feed, entrances)};
};

describe("normalise", () => {

  // NaPTAN calls it "Ashley Down Rail Station"; the MSN calls it "Ashley Down".
  // Exact matching gets 71% of entrances, this gets 86%.
  it("strips the station suffixes the two sources disagree about", () => {
    expect(normalise("Kings Cross Rail Station")).to.equal("kings cross");
    expect(normalise("Kings Cross Railway Station")).to.equal("kings cross");
    expect(normalise("Kings Cross Station")).to.equal("kings cross");
    expect(normalise("Kings Cross")).to.equal("kings cross");
  });

  it("strips a parenthesised suffix", () => {
    expect(normalise("Bushey (Rail Station)")).to.equal("bushey");
  });

  it("strips what follows the suffix", () => {
    expect(normalise("Ely Railway Station Forecourt")).to.equal("ely");
  });

  it("folds punctuation, which the two sources also disagree about", () => {
    expect(normalise("Acton Bridge (Cheshire)")).to.equal(normalise("Acton Bridge Cheshire"));
    expect(normalise("St. Albans")).to.equal(normalise("St Albans"));
  });

  it("keeps a name that identifies the station", () => {
    expect(normalise("Acton Bridge (Cheshire)")).to.equal("acton bridge cheshire");
  });

});

describe("metresBetween", () => {

  it("is zero at the same point", () => {
    expect(metresBetween({latitude: 51.5, longitude: -0.1}, {stop_lat: 51.5, stop_lon: -0.1}))
      .to.equal(0);
  });

  // Euston to Kings Cross is about 800 m.
  it("measures a short distance about right", () => {
    const metres = metresBetween(
      {latitude: 51.5282, longitude: -0.1337},
      {stop_lat: 51.5308, stop_lon: -0.1238}
    );

    expect(metres).to.be.greaterThan(600);
    expect(metres).to.be.lessThan(1000);
  });

});

describe("NaptanEntranceEnricher", () => {

  it("adds an entrance as a child of the station it names", () => {
    const {feed, report} = run(
      [station("KGX", "London Kings Cross")],
      [entrance("0100KGX0", "London Kings Cross Rail Station")]
    );

    expect(report.matched).to.equal(1);

    const added = feed.stop("0100KGX0")!;

    expect(added.location_type).to.equal(2);
    expect(added.parent_station).to.equal("910GKGX");
    expect(added.crs).to.equal("KGX");
  });

  it("keeps NaPTAN's own identifier for the door", () => {
    const {feed} = run([station("KGX", "Kings Cross")], [entrance("0100ASHYDN0", "Kings Cross")]);

    expect(feed.stop("0100ASHYDN0")).to.not.equal(undefined);
  });

  // NaPTAN covers Underground and light rail that the timetable does not.
  it("reports an entrance whose station is not in the feed", () => {
    const {report} = run([station("KGX", "Kings Cross")], [entrance("0100CHM0", "Chesham")]);

    expect(report.matched).to.equal(0);
    expect(report.unmatched).to.equal(1);
  });

  // NaPTAN has an Oakham entrance 574 km from Oakham. Without the distance
  // check that lands on the station and nothing says so.
  it("disbelieves a name match that is implausibly far away", () => {
    const {feed, report} = run(
      [station("OKM", "Oakham", 52.67, -0.72)],
      [entrance("0100OKM0", "Oakham Rail Station", 57.5, -4.2)]
    );

    expect(report.matched).to.equal(0);
    expect(feed.stops).to.have.length(1);
    expect(report.notes?.join(" ")).to.contain("more than 1000 m away");
  });

  it("believes an entrance a few hundred metres away, as a terminus has", () => {
    const {report} = run(
      [station("WAT", "London Waterloo", 51.5031, -0.1132)],
      [entrance("0100WAT0", "London Waterloo Rail Station", 51.5045, -0.1155)]
    );

    expect(report.matched).to.equal(1);
  });

  // Twenty-seven station names are ambiguous once normalised. Taking the first
  // would depend on the order the stops were built in.
  it("attaches to the nearest of two stations sharing a name", () => {
    const {feed} = run(
      [station("BSH", "Bushey", 51.6459, -0.3846), station("BSJ", "Bushey", 53.0, -2.0)],
      [entrance("0100BSH0", "Bushey Rail Station", 51.6461, -0.3849)]
    );

    expect(feed.stop("0100BSH0")!.parent_station).to.equal("910GBSH");
  });

  it("is the same feed whichever order the stations were built in", () => {
    const one = run(
      [station("BSH", "Bushey", 51.6459, -0.3846), station("BSJ", "Bushey", 53.0, -2.0)],
      [entrance("0100BSH0", "Bushey Rail Station", 51.6461, -0.3849)]
    );
    const other = run(
      [station("BSJ", "Bushey", 53.0, -2.0), station("BSH", "Bushey", 51.6459, -0.3846)],
      [entrance("0100BSH0", "Bushey Rail Station", 51.6461, -0.3849)]
    );

    expect(one.feed.stop("0100BSH0")!.parent_station)
      .to.equal(other.feed.stop("0100BSH0")!.parent_station);
  });

  // Two sources claiming one id are not describing the same place.
  it("refuses a second entrance with an id already taken", () => {
    const {feed, report} = run(
      [station("KGX", "Kings Cross")],
      [entrance("0100KGX0", "Kings Cross"), entrance("0100KGX0", "Kings Cross")]
    );

    expect(report.matched).to.equal(1);
    expect(feed.duplicates).to.equal(1);
  });

  it("does not claim the station's accessibility for its door", () => {
    const {feed} = run([station("KGX", "Kings Cross")], [entrance("0100KGX0", "Kings Cross")]);

    expect(feed.stop("0100KGX0")!.wheelchair_boarding).to.equal(0);
  });

  it("leaves the stations it did not match alone", () => {
    const {feed} = run([station("KGX", "Kings Cross")], []);

    expect(feed.stops).to.have.length(1);
    expect(feed.stop("910GKGX")!.location_type).to.equal(1);
  });

});

describe("describe", () => {

  it("says both when NaPTAN has both", () => {
    expect(describeEntrance({indicator: "Main Entrance", street: "Euston Road"}))
      .to.equal("Main Entrance, Euston Road");
  });

  it("says whichever it has", () => {
    expect(describeEntrance({indicator: "Entrance", street: ""})).to.equal("Entrance");
    expect(describeEntrance({indicator: "", street: "York Way"})).to.equal("York Way");
  });

  it("says nothing rather than a stray comma", () => {
    expect(describeEntrance({indicator: "", street: ""})).to.equal("");
    expect(describeEntrance({indicator: "  ", street: " "})).to.equal("");
  });

});
