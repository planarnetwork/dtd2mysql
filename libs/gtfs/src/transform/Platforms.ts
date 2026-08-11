import {CRS, Stop} from "../entity/Stop";
import {Schedule} from "../model/Schedule";

/**
 * A platform designation the feed can build a boarding facility from.
 *
 * `1`, `13`, `A`, `3A`, `4B` are platforms. `DF`, `UM`, `DPL`, `UGL` are running
 * lines - which track a service takes through a junction - and 45 of the 3,750
 * station-platform pairs are those. A passenger cannot stand on a running line,
 * so a call carrying one references the station instead.
 *
 * `BAY` is a real designation and does not match. It is a deliberate casualty
 * rather than a special case, and worth revisiting.
 */
const PLATFORM = /^([0-9]{1,2}[A-Z]?|[A-Z])$/;

/**
 * The stop a call belongs to: the platform where the feed names one, otherwise
 * the station.
 */
export function platformStop(crs: CRS, platform: string | null): CRS {
  return platform !== null && PLATFORM.test(platform) ? `${crs}_${platform}` : crs;
}

/**
 * Split a station into the station and the platforms trains actually call at.
 *
 * The GTFS best practice for a station with several boarding facilities is the
 * structure the spec already defines: the station is `location_type=1`, each
 * platform is `location_type=0` with `parent_station` pointing at it, and the
 * child's name identifies both. A producer extension column would have expressed
 * none of that and every consumer would have needed bespoke code to read it.
 *
 * Only platforms that are called at become stops, so `stops.txt` does not fill
 * with boarding facilities nothing uses. A station where no call names a
 * platform stays a plain stop rather than becoming a childless station.
 */
export function withPlatforms(stations: Stop[], schedules: Schedule[]): Stop[] {
  const byId = new Map(stations.map(station => [station.stop_id, station]));
  const used = new Map<CRS, Set<string>>();
  const unplatformed = new Set<CRS>();

  for (const schedule of schedules) {
    for (const stopTime of schedule.stopTimes) {
      const split = stopTime.stop_id.indexOf("_");

      if (split === -1) {
        unplatformed.add(stopTime.stop_id);
        continue;
      }

      const parent = stopTime.stop_id.slice(0, split);
      const platform = stopTime.stop_id.slice(split + 1);

      if (!byId.has(parent)) {
        continue;
      }

      (used.get(parent) ?? used.set(parent, new Set()).get(parent)!).add(platform);
    }
  }

  // A station is only split when every call at it names a platform. Once a
  // station is location_type=1 no stop time may reference it, so a station where
  // some calls name a platform and some do not cannot be split without either
  // inventing a boarding facility for the calls that do not, or emitting a stop
  // time against a station - which is `location_with_unexpected_stop_time`, and
  // 907 calls hit it before this rule existed.
  const whole = new Set<CRS>();

  for (const parent of [...used.keys()]) {
    if (unplatformed.has(parent)) {
      used.delete(parent);
      whole.add(parent);
    }
  }

  // The calls that did name a platform at a station left whole have to go back
  // to the station, or they reference a stop that was never created.
  if (whole.size > 0) {
    for (const schedule of schedules) {
      for (const stopTime of schedule.stopTimes) {
        const parent = station(stopTime.stop_id);

        if (whole.has(parent)) {
          stopTime.stop_id = parent;
        }
      }
    }
  }

  const platforms: Stop[] = [];

  for (const [parent, names] of used) {
    const station = byId.get(parent)!;

    station.location_type = 1;

    for (const platform of names) {
      platforms.push({
        ...station,
        stop_id: `${parent}_${platform}`,
        stop_name: `${station.stop_name} Platform ${platform}`,
        location_type: 0,
        parent_station: parent,
        platform_code: platform
      });
    }
  }

  if (platforms.length > 0) {
    console.log(
      `Split ${used.size} stations into ${platforms.length} platforms; ` +
      `${whole.size} were left whole because not every call at them names one`
    );
  }

  return [...stations, ...platforms];
}

/**
 * The station a stop belongs to, which is itself unless it is a platform.
 * transfers.txt references stations, never platforms.
 */
export function station(stop: CRS): CRS {
  const split = stop.indexOf("_");

  return split === -1 ? stop : stop.slice(0, split);
}
