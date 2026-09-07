import {awaitStream, splitCSV} from "../util";
import {ShapesStream} from "../../src/gtfs/ShapesStream";

describe("ShapesStream", () => {

  function journey(overrides: any = {}): any {
    return Object.assign(
      {
        route: "M6_MEGA|l",
        routeLinkIds: ["R1", "R2"],
        routeLinks: [
          {
            From: "A", To: "B", Distance: 1000,
            Locations: [
              { Latitude: 51.0, Longitude: -1.0 },
              { Latitude: 51.001, Longitude: -1.0 }
            ]
          },
          {
            From: "B", To: "C", Distance: 2000,
            Locations: [
              { Latitude: 51.001, Longitude: -1.0 },
              { Latitude: 51.01, Longitude: -1.0 }
            ]
          }
        ]
      },
      overrides
    );
  }

  it("emits a header row", async () => {
    const stream = new ShapesStream();
    stream.write(journey());
    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      expect(rows[0].trim()).to.equal("shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled");
    });
  });

  it("emits a point per location with increasing sequence and scaled distance", async () => {
    const stream = new ShapesStream();
    stream.write(journey());
    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const points = rows.slice(1).map(splitCSV);
      // 4 locations across two links, but the shared endpoint between them dedupes to 3 points.
      expect(points.length).to.equal(3);

      const shapeId = points[0][0];
      for (const p of points) expect(p[0]).to.equal(shapeId);

      expect(points.map(p => p[3])).to.deep.equal(["0", "1", "2"]);

      const distances = points.map(p => parseFloat(p[4]));
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).to.be.greaterThanOrEqual(distances[i - 1]);
      }
      // final point is at the cumulative link distance (1000m + 2000m = 3km)
      expect(distances[distances.length - 1]).to.be.closeTo(3, 1e-6);
    });
  });

  it("dedupes shapes that share the same route and route link sequence", async () => {
    const stream = new ShapesStream();
    stream.write(journey());
    stream.write(journey());
    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      // 1 header + 3 points from the first journey; the duplicate journey should be suppressed
      expect(rows.length).to.equal(4);
    });
  });

  it("does not emit NaN when a route link has no measurable length", async () => {
    const degenerate = journey({
      routeLinks: [
        {
          From: "A", To: "B", Distance: 1000,
          Locations: [
            { Latitude: 51.0, Longitude: -1.0 }
          ]
        },
        {
          From: "B", To: "C", Distance: 500,
          Locations: [
            { Latitude: 51.0, Longitude: -1.0 },
            { Latitude: 51.0, Longitude: -1.0 }
          ]
        }
      ]
    });

    const stream = new ShapesStream();
    stream.write(degenerate);
    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      for (const row of rows.slice(1)) {
        expect(row).to.not.include("NaN");
      }
    });
  });

});
