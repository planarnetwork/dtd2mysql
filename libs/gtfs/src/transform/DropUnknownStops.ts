import {Schedule} from "../model/Schedule";
import {CRS} from "../entity/Stop";

/**
 * Remove calls at stops the feed does not publish.
 *
 * The z-train query takes its stop id straight from the ZTR location, which is
 * not always somewhere a stop can be published from: `QHA` and `ZUX` appear in
 * `z_stop_time` and nowhere else - not in `physical_station`, not in `tiploc` -
 * so there is no name and no coordinate for them. The calls go instead.
 *
 * A trip left with fewer than two calls is dropped whole downstream.
 *
 * Sequence numbers are rewritten after a call is removed. GTFS only asks that
 * they increase, so a gap would be legal, but renumbering leaves the trip
 * indistinguishable from one that never lost a call.
 */
export function dropUnknownStops(schedules: Schedule[], published: ReadonlySet<CRS>): Schedule[] {
  const unknown = new Map<CRS, number>();

  // Only a schedule that loses a call is rebuilt. The feed is 2.87 million stop
  // times and 36 of them are dropped, so copying every schedule to avoid
  // mutating 36 would be the expensive way round.
  const result = schedules.map(schedule => {
    if (schedule.stopTimes.every(stop => published.has(stop.stop_id))) {
      return schedule;
    }

    const kept = schedule.stopTimes
      .filter(stop => {
        if (published.has(stop.stop_id)) {
          return true;
        }

        unknown.set(stop.stop_id, (unknown.get(stop.stop_id) ?? 0) + 1);

        return false;
      })
      .map((stop, i) => ({...stop, stop_sequence: i + 1}));

    return schedule.clone(schedule.calendar, schedule.id, kept);
  });

  if (unknown.size > 0) {
    const codes = [...unknown.entries()]
      .sort(([a], [b]) => a < b ? -1 : 1)
      .map(([code, calls]) => `${code} (${calls})`)
      .join(", ");

    console.log(`Dropped ${[...unknown.values()].reduce((a, b) => a + b)} calls at stops the feed does not declare: ${codes}`);
  }

  return result;
}
