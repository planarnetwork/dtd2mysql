import {describe, it, expect} from "vitest";
import {MutableFeed} from "../enrich/MutableFeed";
import {checkKeys, extend} from "./Extend";
import {Extension, ExtensionOutput, extensionFile} from "./Extension";
import {FeedView} from "./FeedView";
import {AreaRow} from "../entity/Area";
import {Stop} from "../entity/Stop";

const stop = (crs: string, name = crs): Stop => ({
  stop_id: `910G${crs}`, crs, tiploc: crs, stop_name: name, stop_desc: "", stop_lat: 51, stop_lon: -1,
  zone_id: 0, stop_url: "", location_type: 1, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0, located: true
});

const platform = (crs: string, platform: string): Stop => ({
  ...stop(crs), stop_id: `9100${crs}${platform}`, location_type: 0,
  parent_station: `910G${crs}`, platform_code: platform
});

const feed = () => new MutableFeed([stop("PAD"), stop("WAT"), platform("PAD", "1")], [], []);

/**
 * Writes one file naming every station it was given.
 */
const lister = (key: string, filename = "areas.txt"): Extension<null> => ({
  key,
  async fetch() {
    return null;
  },
  files(feed: FeedView): ExtensionOutput {
    const rows: AreaRow[] = feed.stations.map(station => ({
      area_id: station.crs, area_name: station.stop_name
    }));

    return {
      files: [extensionFile(filename, rows, row => [row.area_id])],
      report: {extension: key, written: rows.length, dropped: 0}
    };
  }
});

const broken = (key: string, why: string): Extension<null> => ({
  key,
  fetch() {
    return Promise.reject(new Error(why));
  },
  files(): ExtensionOutput {
    throw new Error("not reached");
  }
});

describe("extend", () => {

  it("collects the files an extension builds", async () => {
    const {files, reports} = await extend(feed(), [lister("FARES_V2")]);

    expect(files).to.have.length(1);
    expect(files[0].filename).to.equal("areas.txt");
    expect(files[0].rows).to.deep.equal([
      {area_id: "PAD", area_name: "PAD"},
      {area_id: "WAT", area_name: "WAT"}
    ]);
    expect(reports).to.deep.equal([{extension: "FARES_V2", written: 2, dropped: 0}]);
  });

  // The station is what an external source knows about. A platform is an
  // invention of this build and an extension matching one has matched the wrong
  // thing.
  it("offers the stations rather than every stop", async () => {
    const {files} = await extend(feed(), [lister("FARES_V2")]);

    expect(files[0].rows.map(row => (row as AreaRow).area_id)).to.deep.equal(["PAD", "WAT"]);
  });

  it("names the extension that could not fetch", async () => {
    await expect(extend(feed(), [broken("FARES_V2", "the fares feed is not there")]))
      .rejects.toThrow(/FARES_V2 could not fetch its data: the fares feed is not there/);
  });

  // Whichever stream was opened last would win, and nothing in the output would
  // say the other file had ever been built.
  it("refuses to let two extensions write the same file", async () => {
    await expect(extend(feed(), [lister("FARES_V2"), lister("ZONES")]))
      .rejects.toThrow(/ZONES and FARES_V2 both want to write areas.txt/);
  });

  it("refuses to let an extension replace a file the build writes itself", async () => {
    await expect(extend(feed(), [lister("FARES_V2", "stops.txt")]))
      .rejects.toThrow(/FARES_V2 wants to write stops.txt, which the build writes itself/);
  });

  it("lets two extensions write different files", async () => {
    const {files} = await extend(feed(), [lister("FARES_V2"), lister("ZONES", "zones.txt")]);

    expect(files.map(f => f.filename)).to.deep.equal(["areas.txt", "zones.txt"]);
  });

});

describe("checkKeys", () => {

  it("rejects two extensions with the same key", () => {
    expect(() => checkKeys([lister("FARES_V2"), lister("FARES_V2", "zones.txt")]))
      .to.throw(/Two extensions both call themselves FARES_V2/);
  });

  it("accepts distinct keys", () => {
    expect(() => checkKeys([lister("FARES_V2"), lister("ZONES")])).to.not.throw();
  });

});

describe("FeedView", () => {

  it("finds a station by CRS, which is what a source has", () => {
    expect(feed().station("PAD")?.stop_id).to.equal("910GPAD");
  });

  it("does not find a platform by CRS", () => {
    expect(feed().station("NOT")).to.equal(undefined);
  });

  it("finds any stop by the id the feed publishes", () => {
    expect(feed().stop("9100PAD1")?.platform_code).to.equal("1");
  });

});
