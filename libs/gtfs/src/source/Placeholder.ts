import {Stop} from "../entity/Stop";
import {inBounds} from "./Bounds";

/**
 * `CH ORIGIN`, `XC DESTINATION` and the rest: one pair per operator, in the MSN
 * so a schedule has somewhere to start and end when the real terminus is not
 * known. They are not places, and they currently appear in the feed as stops in
 * the North Sea that trips call at.
 *
 * Three signals have to agree before a station is dropped, because each one on
 * its own deletes real stations:
 *
 * - the name, which no real station has;
 * - a `CATZ` TIPLOC, which 121 stations have, most of them real CIE stations;
 * - a coordinate outside the feed's bounds, which 59 stations have today,
 *   including every CIE station until B10 gives them real ones.
 *
 * A `Q` CRS prefix is not one of the signals. 38 stations have it and most are
 * real.
 */
const name = /^[A-Z]+ (ORIGIN|DESTINATION)$/;

export function isPlaceholder(stop: Stop): boolean {
  return name.test(stop.stop_name)
    && stop.stop_code.startsWith("CATZ")
    && !inBounds(stop.stop_lat, stop.stop_lon);
}

/**
 * The stops that are real, and the codes of the ones that are not so their stop
 * times can go with them. Every trip calling at a placeholder calls at nothing
 * else, so dropping the stop times empties the trip and the existing
 * "fewer than two stops" filter removes it whole.
 */
export function withoutPlaceholders(stops: Stop[]): {stops: Stop[], dropped: Set<string>} {
  const dropped = new Set<string>();
  const kept = stops.filter(stop => {
    if (!isPlaceholder(stop)) {
      return true;
    }

    dropped.add(stop.stop_id);

    return false;
  });

  if (dropped.size > 0) {
    console.log(`Dropped ${dropped.size} operator placeholder stations: ${[...dropped].sort().join(", ")}`);
  }

  return {stops: kept, dropped};
}

/**
 * The stop times that went with the placeholder stations. Reported because it is
 * the only visible effect on services, and because a number that moves means the
 * match has started catching something it should not.
 */
export function reportDroppedStops(dropped: number): void {
  if (dropped > 0) {
    console.log(`Dropped ${dropped} stop times calling at them`);
  }
}
