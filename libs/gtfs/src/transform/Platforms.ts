import {CRS, Stop} from "../entity/Stop";
import {StopTime} from "../entity/StopTime";
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
 * The stations that become `location_type=1`, and the platforms beneath them.
 *
 * The GTFS best practice for a station with several boarding facilities is the
 * structure the spec already defines: the station is `location_type=1`, each
 * platform is `location_type=0` with `parent_station` pointing at it, and the
 * child's name identifies both.
 *
 * **A station is only split when every call at it names a platform.** Once it is
 * `location_type=1` no stop time may reference it, so a station where some calls
 * name a platform and some do not cannot be split without inventing a boarding
 * facility for the ones that do not - 907 `location_with_unexpected_stop_time`
 * errors when tried.
 *
 * Nothing here touches a stop time. The suffixed id belongs to stop_times.txt
 * and is composed by `stopId` when the file is written, so overlays,
 * associations and merges only ever see the CRS. **Keep it that way**: an
 * association names a bare CRS, so a stop id carrying a platform stops every
 * association matching, silently.
 */
export function withPlatforms(stations: Stop[], schedules: Schedule[]): {stops: Stop[], split: Set<CRS>} {
  const byId = new Map(stations.map(station => [station.stop_id, station]));
  const used = new Map<CRS, Set<string>>();
  const unplatformed = new Set<CRS>();

  for (const schedule of schedules) {
    for (const stopTime of schedule.stopTimes) {
      const platform = stopTime.platform;

      if (platform === null || !PLATFORM.test(platform)) {
        unplatformed.add(stopTime.stop_id);
      }
      else if (byId.has(stopTime.stop_id)) {
        (used.get(stopTime.stop_id) ?? used.set(stopTime.stop_id, new Set()).get(stopTime.stop_id)!).add(platform);
      }
    }
  }

  let whole = 0;

  for (const parent of [...used.keys()]) {
    if (unplatformed.has(parent)) {
      used.delete(parent);
      whole++;
    }
  }

  const platforms: Stop[] = [];
  // A station that gains platforms becomes location_type=1. Returned as a new
  // object rather than set on the caller's: nothing here owns the input.
  const parents = stations.map(s => used.has(s.stop_id) ? {...s, location_type: 1 as const} : s);

  for (const [parent, names] of used) {
    const station = byId.get(parent)!;

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
      `${whole} were left whole because not every call at them names one`
    );
  }

  return {stops: [...parents, ...platforms], split: new Set(used.keys())};
}

/**
 * The stop id a call is written against: the platform beneath the station where
 * the station was split, the station itself otherwise.
 */
export function stopId(stopTime: StopTime, split: ReadonlySet<CRS>): CRS {
  return split.has(stopTime.stop_id) ? `${stopTime.stop_id}_${stopTime.platform}` : stopTime.stop_id;
}

/**
 * stop_times.txt as it is written: the platform decides the stop id and is not
 * a column of its own.
 */
export function toStopTimeRow(stopTime: StopTime, split: ReadonlySet<CRS>) {
  return {
    trip_id: stopTime.trip_id,
    arrival_time: stopTime.arrival_time,
    departure_time: stopTime.departure_time,
    stop_id: stopId(stopTime, split),
    stop_sequence: stopTime.stop_sequence,
    stop_headsign: stopTime.stop_headsign,
    pickup_type: stopTime.pickup_type,
    drop_off_type: stopTime.drop_off_type,
    shape_dist_traveled: stopTime.shape_dist_traveled,
    timepoint: stopTime.timepoint
  };
}
