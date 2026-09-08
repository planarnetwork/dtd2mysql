import { describe, it, expect } from "vitest";
import { COLUMNS, entityTypeOf } from "./EntityType.js";

describe("entityTypeOf", () => {

  it("names the entity each file holds", () => {
    expect(entityTypeOf("calendar.txt")).to.equal("calendar");
    expect(entityTypeOf("calendar_dates.txt")).to.equal("calendar_date");
    expect(entityTypeOf("trips.txt")).to.equal("trip");
    expect(entityTypeOf("stop_times.txt")).to.equal("stop_time");
    expect(entityTypeOf("transfers.txt")).to.equal("transfer");
    expect(entityTypeOf("feed_info.txt")).to.equal("feed_info");
    expect(entityTypeOf("stops.txt")).to.equal("stop");
    expect(entityTypeOf("routes.txt")).to.equal("route");
    expect(entityTypeOf("agency.txt")).to.equal("agency");
    expect(entityTypeOf("areas.txt")).to.equal("area");
    expect(entityTypeOf("stop_areas.txt")).to.equal("stop_area");
  });

  it("reads a feed that nests its files in a directory", () => {
    expect(entityTypeOf("gtfs/stop_times.txt")).to.equal("stop_time");
    expect(entityTypeOf("some/deep/path/stops.txt")).to.equal("stop");
  });

  it("ignores the files the loader does not read", () => {
    expect(entityTypeOf("links.txt")).to.equal(undefined);
    expect(entityTypeOf("shapes.txt")).to.equal(undefined);
    expect(entityTypeOf("attributions.txt")).to.equal(undefined);
  });

  it("ignores directory entries", () => {
    expect(entityTypeOf("gtfs/")).to.equal(undefined);
  });

  it("ignores the metadata a zip made on a mac carries", () => {
    expect(entityTypeOf("__MACOSX/._stops.txt")).to.equal(undefined);
  });

  it("does not mistake a file whose name merely ends in one it reads", () => {
    expect(entityTypeOf("old_stops.txt")).to.equal(undefined);
  });

});

describe("COLUMNS", () => {

  it("takes only the stop time columns the loader reads", () => {
    // the order of the calls comes from the order of the rows, so stop_sequence is not needed
    expect(COLUMNS.stop_time.includes("stop_sequence")).to.equal(false);
    expect(COLUMNS.stop_time.includes("timepoint")).to.equal(false);
    expect(COLUMNS.stop_time.length).to.equal(6);
  });

});
