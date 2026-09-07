import {describe, it, expect} from "vitest";
import {RouteRow, RouteType} from "@gb-transit/gtfs-schema";
import {RouteMerger} from "./RouteMerger";
import {Sequence} from "../../sequence/Sequence";
import {collect, route} from "./Fixtures";

describe("RouteMerger", () => {

  it("re-indexes the routes and maps the old id to the new", async () => {
    const routes = collect<RouteRow>();
    const map = await new RouteMerger(routes, new Sequence(), {}).write([
      route("original-a", RouteType.Rail), route("original-b", RouteType.Bus)
    ]);

    expect(routes.rows.map(r => r.route_id)).to.deep.equal(["1", "2"]);
    expect(map).to.deep.equal({"original-a": "1", "original-b": "2"});
  });

  it("drops a route of a removed type, and leaves it out of the map", async () => {
    const routes = collect<RouteRow>();
    const map = await new RouteMerger(routes, new Sequence(), {[RouteType.Bus]: true}).write([
      route("rail", RouteType.Rail), route("bus", RouteType.Bus)
    ]);

    expect(routes.rows.length).to.equal(1);
    expect(map["bus"]).to.equal(undefined);
  });

});
