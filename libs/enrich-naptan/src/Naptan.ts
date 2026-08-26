import {Attribution, Enricher, EnrichmentReport, MutableFeed} from "@gb-transit/gtfs";
import {stationName} from "./StationName";

/**
 * One NaPTAN record, reduced to the parts a GTFS stop wants.
 */
export interface NaptanStop {
  readonly tiploc: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly locality: string;
  readonly active: boolean;
}

export const NAPTAN = "NAPTAN";

const ATTRIBUTION: Attribution = {
  organisation: "Department for Transport",
  licence: "Open Government Licence v3.0",
  url: "https://naptan.dft.gov.uk",
  shareAlike: false
};

/**
 * Where a station actually is, from NaPTAN.
 *
 * The DTD gives coordinates as OSGB eastings and northings rounded to 100
 * metres and then encoded, so the best the feed can do unaided is a point
 * somewhere in the station car park. NaPTAN surveys them.
 *
 * **It joins on TIPLOC, not CRS.** A NaPTAN rail record is `9100` followed by
 * the TIPLOC - `9100ABDARE` - which is the id the feed publishes for the
 * station's boarding point and `Stop.tiploc` internally. That is also why the
 * feed has to carry the station's own TIPLOC rather than whichever one a
 * junction sharing its CRS happened to contribute.
 *
 * Only coordinates by default. NaPTAN's `CommonName` is "Aberdare Rail Station"
 * where the departure boards say "Aberdare", so taking the name as well is a
 * decision rather than something to inflict by default - `options: {names:
 * true}` makes it.
 *
 * The suffix is the whole of that objection, and `stationName` removes it: of
 * the 2,580 stations both sources describe, **2,454 names are then identical**.
 * The 126 that differ are mostly county style - "Acton Bridge (Cheshire)"
 * against "Acton Bridge", "(Lancs)" against "(Lancashire)" - with NaPTAN
 * usually the better of the two on casing and occasionally wrong on fact.
 */
export class NaptanEnricher implements Enricher<readonly NaptanStop[]> {

  public readonly key = NAPTAN;
  public readonly dependsOn: readonly string[] = [];
  public readonly attribution = ATTRIBUTION;

  constructor(
    private readonly source: () => Promise<readonly NaptanStop[]>,
    public readonly priority: number = 50,
    /**
     * Whether to take a coordinate from a record NaPTAN has marked inactive.
     * 14 of the matches are, and a closed station's surveyed position is still
     * better than a rounded grid reference - but it should be a choice.
     */
    private readonly includeInactive: boolean = true,
    /**
     * Whether to take NaPTAN's station name as well as its position. Off,
     * because it is a change to what every station in the feed is called and
     * that is a decision to make deliberately.
     */
    private readonly includeNames: boolean = false
  ) {}

  public fetch(): Promise<readonly NaptanStop[]> {
    return this.source();
  }

  public apply(feed: MutableFeed, stops: readonly NaptanStop[]): EnrichmentReport {
    const byTiploc = new Map(stops.map(stop => [stop.tiploc, stop]));
    const notes: string[] = [];

    let matched = 0;
    let unmatched = 0;
    let inactive = 0;
    let renamed = 0;

    for (const station of feed.stations) {
      const naptan = byTiploc.get(station.tiploc);

      if (naptan === undefined) {
        unmatched++;
        continue;
      }

      if (!naptan.active) {
        inactive++;

        if (!this.includeInactive) {
          continue;
        }
      }

      feed.set(station, "stop_lat", naptan.latitude, this);
      feed.set(station, "stop_lon", naptan.longitude, this);
      feed.set(station, "located", true, this);

      if (this.includeNames) {
        const name = stationName(naptan.name);

        // A station NaPTAN calls only "Rail Station" would end up nameless,
        // which is worse than the upper case name it already had.
        // Counted before the write, not after: `set` mutates the stop, so
        // comparing afterwards compares the new name with itself and reports
        // that nothing was renamed.
        if (name !== "" && name !== station.stop_name) {
          renamed += feed.set(station, "stop_name", name, this) ? 1 : 0;
        }
      }

      matched++;
    }

    // Unmatched is not a failure here and saying only the number invites
    // somebody to chase it. NaPTAN's rail records cover railway stations;
    // the feed also carries bus, coach, tram, Underground and ferry stops,
    // which live under other NaPTAN types entirely.
    if (unmatched > 0) {
      notes.push(`${unmatched} stops are not railway stations, so NaPTAN's rail records do not cover them`);
    }

    if (renamed > 0) {
      notes.push(`${renamed} stations were renamed to what NaPTAN calls them`);
    }

    if (inactive > 0) {
      notes.push(
        `${inactive} matched a record NaPTAN marks inactive, ` +
        (this.includeInactive ? "and were used anyway" : "and were skipped")
      );
    }

    return {enricher: this.key, matched, unmatched, conflicts: 0, notes};
  }

}
