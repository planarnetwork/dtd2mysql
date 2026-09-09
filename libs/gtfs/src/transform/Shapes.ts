import {createHash} from "node:crypto";
import {CRS, Shape, ShapeID, Stop} from "@gb-transit/gtfs-schema";
import {Schedule} from "../model/Schedule";

/**
 * How many decimal places a shape point is written to.
 *
 * Six is about eleven centimetres, which is far finer than the thing being
 * described: a shape here is a straight line between one station and the next,
 * so it is already wrong by kilometres wherever the track bends. The stops it
 * has to stay near are 100 metres away before a validator says anything.
 *
 * It is rounding rather than precision for its own sake. `stops.txt` carries
 * whatever the coordinate arrived as - `-4.258423995105473` where the OSGB
 * conversion produced it and `-3.443099147` where NaPTAN did - and 196,730
 * shape points written at seventeen digits are a megabyte of noise.
 */
const PLACES = 6;

/**
 * How many characters of the digest name a shape.
 *
 * Twelve is 48 bits, which over the 13,722 shapes a national feed has leaves a
 * one in three million chance that two paths collide. Cheap insurance is
 * cheaper still: `shapes` throws if two ever do, so the feed cannot be
 * published with one line quietly standing in for another.
 *
 * Not the full digest, because the id is written 278,794 times in `trips.txt`
 * and twenty characters of it are a further two megabytes of feed that say
 * nothing.
 */
const ID_LENGTH = 12;

/**
 * The lines a feed's trips run over, and which trip runs over which.
 */
export interface FeedShapes {
  readonly shapes: Shape[];
  /** By `trip_id`, and missing for a trip with nowhere to draw. */
  readonly byTrip: ReadonlyMap<string, ShapeID>;
}

/**
 * Draw each trip as a line through the stations it touches.
 *
 * The line comes from `Schedule.path`, which is every timing point rather than
 * every call, so a train that runs through Peterborough without stopping is
 * drawn through Peterborough. That is the whole reason this exists: the calls
 * alone put a 395 kilometre straight line between King's Cross and Newcastle,
 * and the passing points break it into the twenty-odd hops the East Coast Main
 * Line actually makes.
 *
 * **It is not the track.** 2,170,472 of the CIF's 3,062,488 passing points are
 * junctions, loops and signal boxes, and the DTD gives no coordinate for any of
 * them - `WATRLWC`, `LEEDSWJ`, `HTRWAJN`. What is left is a station-to-station
 * sketch of the route: good enough to tell a Bristol train from a Birmingham
 * one on a map, not good enough to draw the railway.
 *
 * One shape per distinct path, not per trip. A line on the ground carries every
 * stopping pattern that runs over it, so the fast and the stopper share a shape
 * and the national feed has 13,722 of them for 278,794 trips. It also means the
 * shapes fall out of the *path* and never out of the calls, which is what makes
 * the two feeds - with and without passing points in `stop_times.txt` - draw
 * the same lines.
 */
export function shapes(
  schedules: readonly Schedule[],
  stations: ReadonlyMap<CRS, Stop>
): FeedShapes {
  const rows: Shape[] = [];
  const pathById = new Map<ShapeID, string>();
  const byTrip = new Map<string, ShapeID>();

  for (const schedule of schedules) {
    if (schedule.stopTimes.length === 0) {
      continue;
    }

    const points = placeable(schedule, stations);

    // A line needs two ends. One point, or none, is a trip every station of
    // which is missing a coordinate, and an empty shape_id is a truer answer
    // than a line of length zero.
    if (points.length < 2) {
      continue;
    }

    const key = points.join(">");
    const id = createHash("sha1").update(key).digest("hex").slice(0, ID_LENGTH);
    const seen = pathById.get(id);

    if (seen === undefined) {
      pathById.set(id, key);
      points.forEach((crs, i) => rows.push(point(id, stations.get(crs)!, i + 1)));
    }
    else if (seen !== key) {
      throw new Error(
        `Two different paths are both shape ${id}: "${seen}" and "${key}". ` +
        `Lengthen ID_LENGTH in Shapes.ts.`
      );
    }

    byTrip.set(schedule.stopTimes[0].trip_id, id);
  }

  return {shapes: rows, byTrip};
}

/**
 * The stations of a schedule's path that the feed can put on a map, in order
 * and without repeating one twice running.
 *
 * A path point with no station is dropped rather than the shape abandoned: the
 * z-trains have no path at all and their calls stand in, and `locate` withholds
 * a station nothing references, so a line is drawn through what is known rather
 * than not at all.
 *
 * Consecutive duplicates are collapsed again here even though `ScheduleBuilder`
 * already did it, because dropping a station between two calls at another one
 * can put the same place next to itself.
 */
function placeable(schedule: Schedule, stations: ReadonlyMap<CRS, Stop>): CRS[] {
  const path = schedule.path.length > 0
    ? schedule.path
    : schedule.stopTimes.map(stop => stop.stop_id);
  const points: CRS[] = [];

  for (const crs of path) {
    const station = stations.get(crs);

    if (station !== undefined && station.located && points[points.length - 1] !== crs) {
      points.push(crs);
    }
  }

  return points;
}

function point(shapeId: ShapeID, station: Stop, sequence: number): Shape {
  return {
    shape_id: shapeId,
    shape_pt_lat: round(station.stop_lat),
    shape_pt_lon: round(station.stop_lon),
    shape_pt_sequence: sequence,
    // Left out on purpose. GTFS only reads it where `stop_times.txt` carries it
    // too, and putting a distance on all 2.9 million calls to disambiguate the
    // 2.5% of trips that pass the same station twice is a poor trade - it is
    // the largest file in the feed and this is the smallest problem in it.
    shape_dist_traveled: null
  };
}

function round(degrees: number): number {
  return Number(degrees.toFixed(PLACES));
}
