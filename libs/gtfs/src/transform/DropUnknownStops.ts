import {Schedule} from "../model/Schedule";
import {CRS} from "../entity/Stop";

/**
 * Remove calls at stops the feed does not publish.
 *
 * The z-train query takes its stop id straight from the ZTR location, and the
 * comment claiming those "already use CRS codes so avoid the disaster above" is
 * wrong: `QHA` and `ZUX` appear in `z_stop_time` and nowhere else - not in
 * `physical_station`, not even in `tiploc`. There is no name and no coordinate
 * to publish a stop from, so the calls go instead, and the feed stops pointing
 * at stops it does not declare.
 *
 * Every affected trip today has two stops, so 31 of the 36 fall to one call and
 * are dropped whole by the "fewer than two stops" filter downstream. That is not
 * a loss of service - a trip from a real station to a station that does not
 * exist was never usable.
 *
 * Sequence numbers are rewritten after a call is removed. GTFS only asks that
 * they increase, so a gap would be legal, but a renumbered trip reads the same
 * as one that never had the problem.
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
