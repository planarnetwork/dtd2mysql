import {Platform} from "../entity/StopTime";
import {StopID, TIPLOC} from "../entity/Stop";

/**
 * A station, as a NaPTAN stop area: `910G` and the TIPLOC of the station itself.
 */
const STATION = "910G";

/**
 * A place a passenger boards, as a NaPTAN access node: `9100`, the TIPLOC of the
 * timing point, and the platform where one is known.
 */
const STOP_POINT = "9100";

/**
 * The identifiers the rest of Great Britain's public transport data uses.
 *
 * A CRS code names a station and nothing else, so a feed built on them can only
 * ever sit alongside the DfT's GTFS rather than merge with it. NaPTAN's ATCO
 * codes name every stop in the country, and the rail ones are a function of the
 * TIPLOC - which the timetable already carries - so nothing external is needed
 * to produce them.
 *
 * Clapham Junction is `910GCLPHMJC`, and the platforms beneath it are
 * `9100CLPHMJC15`, `9100CLPHMJW3`, `9100CLPHMJM11`: the West London and Main
 * Line platforms take the TIPLOC of the timing point a train actually calls at,
 * not the station's, which is what makes them the same identifiers the DfT
 * publishes.
 *
 * **Composed where a file is written and nowhere else.** `stop_id` is a CRS
 * code through every transform, because an association names a bare CRS and an
 * id that is not one stops every association matching, silently. See the B23
 * note in `docs/restructure.md`.
 */
export function stationId(tiploc: TIPLOC): StopID {
  return STATION + tiploc;
}

export function stopPointId(tiploc: TIPLOC, platform: Platform | null): StopID {
  return STOP_POINT + tiploc + (platform ?? "");
}
