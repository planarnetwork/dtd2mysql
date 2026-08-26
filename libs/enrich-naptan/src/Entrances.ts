import {Attribution, Enricher, EnrichmentReport, MutableFeed, Stop} from "@gb-transit/gtfs";
import {NaptanEntrance} from "./Naptan";

export const NAPTAN_ENTRANCES = "NAPTAN_ENTRANCES";

const ATTRIBUTION: Attribution = {
  organisation: "Department for Transport",
  licence: "Open Government Licence v3.0",
  url: "https://naptan.dft.gov.uk",
  shareAlike: false
};

/**
 * How far an entrance may be from its station before the match is disbelieved.
 *
 * Generous on purpose. A terminus is hundreds of metres across and its
 * entrances genuinely are far from the point that stands for the station, so a
 * tight radius would throw away good data. What this is really for is the
 * handful of records with a broken position - NaPTAN has an Oakham entrance 574
 * km from Oakham - and a name that matched the wrong station entirely.
 */
const MAX_METRES = 1000;

/**
 * Station entrances, from NaPTAN.
 *
 * A station in this feed is one point, which is the point a schedule calls at.
 * A rider arriving on foot needs the door, and a large station has several in
 * different streets - Kings Cross has entrances on Euston Road and York Way,
 * and which one you want depends on where you are coming from.
 *
 * **The join is by name, verified by distance.** Entrance ATCO codes are
 * locality-prefixed - `0100ASHYDN0` - not `9100` plus the TIPLOC, so unlike
 * D3's coordinates there is no identifier to join on. Names match once the
 * "Rail Station" / "Railway Station" / "Station" suffixes are normalised away,
 * and the distance check is what turns a fuzzy match into a verified one:
 * without it an entrance whose name collides with another station attaches
 * silently to the wrong place.
 */
export class NaptanEntranceEnricher implements Enricher<readonly NaptanEntrance[]> {

  public readonly key = NAPTAN_ENTRANCES;
  public readonly dependsOn: readonly string[] = [];
  public readonly attribution = ATTRIBUTION;

  constructor(
    private readonly source: () => Promise<readonly NaptanEntrance[]>,
    public readonly priority: number = 50,
    private readonly maxMetres: number = MAX_METRES
  ) {}

  public fetch(): Promise<readonly NaptanEntrance[]> {
    return this.source();
  }

  public apply(feed: MutableFeed, entrances: readonly NaptanEntrance[]): EnrichmentReport {
    const byName = new Map<string, Stop[]>();

    for (const station of feed.stations) {
      const name = normalise(station.stop_name);
      const found = byName.get(name) ?? [];

      found.push(station);
      byName.set(name, found);
    }

    const notes: string[] = [];

    let matched = 0;
    let unmatched = 0;
    let tooFar = 0;

    for (const entrance of entrances) {
      const candidates = byName.get(normalise(entrance.name));

      if (candidates === undefined) {
        unmatched++;
        continue;
      }

      // Twenty-seven station names are ambiguous once normalised - two
      // Busheys, two Clapham Junctions - so the nearest is taken rather than
      // the first, which would depend on the order the stops were built in.
      const nearest = candidates
        .map(station => ({station, metres: metresBetween(entrance, station)}))
        .sort((a, b) => a.metres - b.metres)[0];

      if (nearest.metres > this.maxMetres) {
        tooFar++;
        continue;
      }

      feed.add(toEntrance(entrance, nearest.station), this) ? matched++ : unmatched++;
    }

    if (unmatched > 0) {
      notes.push(
        `${unmatched} entrances name a station this feed does not contain - NaPTAN covers ` +
        `Underground and light rail stations that the timetable does not`
      );
    }

    if (tooFar > 0) {
      notes.push(
        `${tooFar} entrances matched a station name but sit more than ${this.maxMetres} m away, ` +
        `so the match was not believed`
      );
    }

    if (feed.duplicates > 0) {
      notes.push(`${feed.duplicates} stops were refused because their id was already taken`);
    }

    return {enricher: this.key, matched, unmatched, conflicts: 0, notes};
  }

}

/**
 * A station name reduced to the part that identifies it.
 *
 * NaPTAN calls the same place "Ashley Down Rail Station" and the MSN calls it
 * "Ashley Down"; entrances add "Railway Station", "Station" and the occasional
 * "Forecourt". Exact matching gets 71% of them and this gets 86%.
 */
export function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\((rail|railway)\s+station\)\s*$/, "")
    .replace(/\s+(rail|railway)\s+station\b.*$/, "")
    .replace(/\s+station\b.*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Metres between two points, on a sphere.
 *
 * Good enough at this range: the error against a proper geodesic is centimetres
 * over a kilometre, and the threshold is a kilometre.
 */
export function metresBetween(
  a: {latitude: number, longitude: number},
  b: {stop_lat: number, stop_lon: number}
): number {
  const R = 6371000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.stop_lat);
  const dLat = toRadians(b.stop_lat - a.latitude);
  const dLon = toRadians(b.stop_lon - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * The most that can be said about where a door is.
 *
 * "Main Entrance, Euston Road" where NaPTAN has both, and whichever it has
 * otherwise. Empty is honest when it has neither - four of Birmingham New
 * Street's entrances say only "Entrance", and repeating that four times tells a
 * rider nothing it did not already know.
 */
export function describe(entrance: {indicator: string, street: string}): string {
  return [entrance.indicator.trim(), entrance.street.trim()].filter(part => part !== "").join(", ");
}

/**
 * An entrance as a GTFS stop.
 *
 * `location_type=2` and a `parent_station`, which is what the spec has for a
 * door. It keeps NaPTAN's ATCO code as its id: it is already a stable national
 * identifier for exactly this thing, and inventing one would mean the feed's id
 * for a door disagreeing with everybody else's.
 */
function toEntrance(entrance: NaptanEntrance, station: Stop): Stop {
  return {
    stop_id: entrance.atco,
    crs: station.crs,
    tiploc: station.tiploc,
    stop_name: entrance.name,
    // What tells two doors of one station apart. Neither field does it alone:
    // Indicator is "Entrance" on 1,821 of 4,308 records, and Street is blank on
    // 1,263, so the useful description is whichever exist, together.
    stop_desc: describe(entrance),
    stop_lat: entrance.latitude,
    stop_lon: entrance.longitude,
    located: true,
    zone_id: station.zone_id,
    stop_url: "",
    location_type: 2 as Stop["location_type"],
    parent_station: station.stop_id,
    platform_code: null,
    stop_timezone: station.stop_timezone,
    // Not inherited from the station: whether you can get through this door is
    // not the same question as whether the station is step-free, and NaPTAN
    // does not say. 0 is "no information".
    wheelchair_boarding: 0
  };
}
