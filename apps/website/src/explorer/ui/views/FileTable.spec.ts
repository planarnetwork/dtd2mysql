import {describe, it, expect} from "vitest";
import {LINKS} from "./FileTable.js";
import {parse, format} from "../../route.js";

/**
 * Which view each id column opens.
 *
 * Worth a test of its own because getting it wrong is invisible: a link that goes to the wrong view
 * is still a link, and the view at the other end describes whatever it was handed. `shape_id` went
 * to the service view for a day and reported every shape as a service that runs on no days and has
 * no trips, which reads like a data problem rather than a broken link.
 */
describe("the id columns a table links", () => {

  it("sends each column to the view that explains it", () => {
    expect(LINKS).to.deep.equal({
      stop_id: "stop",
      parent_station: "stop",
      from_stop_id: "stop",
      to_stop_id: "stop",
      trip_id: "trip",
      from_trip_id: "trip",
      to_trip_id: "trip",
      route_id: "route",
      service_id: "service",
      shape_id: "shape"
    });
  });

  it("sends a shape to the shape view, not the service view", () => {
    expect(LINKS.shape_id).to.equal("shape");
  });

  /**
   * The link has to survive the round trip, or it opens the overview and looks like the id was not
   * found.
   */
  it("builds a link every column parses back to", () => {
    for (const [column, view] of Object.entries(LINKS)) {
      const href = format({view, id: "X1"} as never);

      expect(parse(href), column).to.deep.equal({view, id: "X1"});
    }
  });

  it("does not link a column that is not an id of something", () => {
    for (const column of ["shape_pt_lat", "arrival_time", "stop_name", "shape_pt_sequence"]) {
      expect(LINKS[column], column).to.equal(undefined);
    }
  });

});
