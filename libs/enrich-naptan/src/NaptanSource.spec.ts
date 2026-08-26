import {describe, it, expect} from "vitest";
import {parseNaptan} from "./NaptanSource";
import {MutableFeed} from "@gb-transit/gtfs";
import type {Stop} from "@gb-transit/gtfs";
import {NaptanEnricher} from "./Naptan";
import type {NaptanStop} from "./Naptan";

const header = "ATCOCode,CommonName,LocalityName,Longitude,Latitude,StopType,Status";
const csv = (...rows: string[]) => [header, ...rows].join("\n") + "\n";

describe("parseNaptan", () => {

  it("reads a rail station, keyed on the TIPLOC inside the ATCO code", () => {
    const [stop] = parseNaptan(csv("9100ABDARE,Aberdare Rail Station,Aberdare,-3.443,51.715,RLY,active"));

    expect(stop).to.deep.equal({
      tiploc: "ABDARE",
      name: "Aberdare Rail Station",
      latitude: 51.715,
      longitude: -3.443,
      locality: "Aberdare",
      active: true
    });
  });

  it("ignores everything that is not a railway station", () => {
    expect(parseNaptan(csv(
      "490000001,A bus stop,Somewhere,-0.1,51.5,BCT,active",
      "9400ZZLUACT1,Acton Town,London,-0.28,51.50,MET,active"
    ))).to.deep.equal([]);
  });

  it("drops a record whose position is blank", () => {
    // NaPTAN carries rail records with no coordinate - Bond Street and
    // Tottenham Court Road among them. Number("") is 0, so an empty field that
    // reaches the conversion puts a London station in the Gulf of Guinea.
    expect(parseNaptan(csv("9100BONDST,Bond Street,London,,,RLY,active"))).to.deep.equal([]);
  });

  it("drops a record whose position is not a number", () => {
    expect(parseNaptan(csv("9100NOWHERE,Nowhere,Nowhere,east,north,RLY,active"))).to.deep.equal([]);
  });

  it("notices an inactive record rather than hiding it", () => {
    const [stop] = parseNaptan(csv("9100OLDSTN,Old Station,Somewhere,-1,52,RLY,inactive"));

    expect(stop.active).to.equal(false);
  });

});

describe("NaptanEnricher names", () => {

  const station = (crs: string, name: string): Stop => ({
    stop_id: `910G${crs}`, crs, tiploc: crs, stop_name: name, stop_desc: "", stop_lat: 51,
    stop_lon: -1, zone_id: 0, stop_url: "", location_type: 1, parent_station: null,
    platform_code: null, stop_timezone: "Europe/London", wheelchair_boarding: 0, located: false
  });

  const naptan = (tiploc: string, name: string): NaptanStop =>
    ({tiploc, name, latitude: 52, longitude: -2, locality: "", active: true});

  const run = (stops: Stop[], data: NaptanStop[], names: boolean) => {
    const feed = new MutableFeed(stops, [], []);

    return {
      feed,
      report: new NaptanEnricher(() => Promise.resolve(data), 50, true, names).apply(feed, data)
    };
  };

  // The default has to stay coordinates only: renaming every station in the
  // feed is a decision, not a side effect of enabling an enricher.
  it("leaves the name alone unless asked", () => {
    const {feed} = run([station("ABA", "ABERDARE")], [naptan("ABA", "Aberdare Rail Station")], false);

    expect(feed.stop("910GABA")!.stop_name).to.equal("ABERDARE");
  });

  it("takes the name without its suffix when asked", () => {
    const {feed} = run([station("ABA", "ABERDARE")], [naptan("ABA", "Aberdare Rail Station")], true);

    expect(feed.stop("910GABA")!.stop_name).to.equal("Aberdare");
  });

  // `set` mutates the stop, so counting after the write compares the new name
  // with itself and reports that nothing happened.
  it("counts the stations it renamed", () => {
    const {report} = run(
      [station("ABA", "ABERDARE"), station("ACB", "Acton Bridge")],
      [naptan("ABA", "Aberdare Rail Station"), naptan("ACB", "Acton Bridge Rail Station")],
      true
    );

    expect(report.notes?.join(" ")).to.contain("1 stations were renamed");
  });

  it("keeps the name it had when NaPTAN has nothing but the suffix", () => {
    const {feed} = run([station("ABA", "ABERDARE")], [naptan("ABA", "Rail Station")], true);

    expect(feed.stop("910GABA")!.stop_name).to.equal("ABERDARE");
  });

});
