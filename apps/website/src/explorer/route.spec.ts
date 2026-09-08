import {describe, it, expect} from "vitest";
import {format, parse} from "./route.js";
import type {Route} from "./route.js";

const routes: Route[] = [
  {view: "overview"},
  {view: "file", file: "stop_times.txt", page: 0, filters: {}},
  {view: "file", file: "stop_times.txt", page: 14, filters: {}},
  {view: "file", file: "stops.txt", page: 0, sort: "stop_name", filters: {}},
  {view: "file", file: "stops.txt", page: 2, sort: "stop_name", descending: true, filters: {}},
  {view: "file", file: "trips.txt", page: 0, filters: {trip_id: "C000", service_id: "1"}},
  {view: "stop", id: "910GCLPHMJC"},
  {view: "trip", id: "C00049_20260517_20261206"},
  {view: "route", id: "HX"},
  {view: "service", id: "10"},
  {view: "board", id: "910GCLPHMJC", date: 20260910},
  {view: "checks"},
  {view: "checks", id: "parent-child-distance"},
  {view: "validation"},
  {view: "validation", code: "point_near_origin"},
  {view: "provenance"}
];

describe("route", () => {

  for (const route of routes) {
    it(`round trips ${format(route)}`, () => {
      expect(parse(format(route))).to.deep.equal(route);
    });
  }

  it("round trips an id holding a slash", () => {
    // Nothing stops a GTFS id from holding one, and an id that broke the URL would be an entity
    // nobody could link to.
    const route: Route = {view: "stop", id: "oddly/named"};

    expect(format(route)).to.equal("#/stop/oddly%2Fnamed");
    expect(parse(format(route))).to.deep.equal(route);
  });

  it("round trips a filter term holding an ampersand", () => {
    const route: Route = {view: "file", file: "stops.txt", page: 0, filters: {stop_name: "a & b"}};

    expect(parse(format(route))).to.deep.equal(route);
  });

  it("keeps a column called page from shadowing the paging", () => {
    const route: Route = {view: "file", file: "odd.txt", page: 3, filters: {page: "7"}};

    expect(parse(format(route))).to.deep.equal(route);
  });

  it("reads an empty hash as the overview", () => {
    expect(parse("")).to.deep.equal({view: "overview"});
    expect(parse("#")).to.deep.equal({view: "overview"});
    expect(parse("#/")).to.deep.equal({view: "overview"});
  });

  it("lands somewhere rather than nowhere for a hash it does not know", () => {
    // A link from an issue written against a different version of this should still land.
    expect(parse("#/wibble/thing")).to.deep.equal({view: "overview"});
    expect(parse("#/stop")).to.deep.equal({view: "overview"});
    expect(parse("#/board/910GCLPHMJC")).to.deep.equal({view: "overview"});
  });

  it("ignores a page that is not a page", () => {
    expect(parse("#/file/stops.txt?page=-4")).to.deep.contain({page: 0});
    expect(parse("#/file/stops.txt?page=wibble")).to.deep.contain({page: 0});
    expect(parse("#/file/stops.txt?page=2.7")).to.deep.contain({page: 2});
  });

  it("drops an empty filter rather than carrying it", () => {
    const route = parse("#/file/stops.txt?f.stop_name=");

    expect(route.view).to.equal("file");
    expect((route as Extract<Route, {view: "file"}>).filters).to.deep.equal({});
  });

});
