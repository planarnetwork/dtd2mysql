
/**
 * The identifiers a CIF record carries onto the GTFS rows built from it.
 *
 * They are CIF names rather than GTFS ones - a TUID is the train unique
 * identifier and an RSID the retail service identifier - but `trips.txt` is
 * where they end up, so `Trip` needs them and they live here rather than beside
 * the overlay record they came from. That keeps the entity types free of
 * dependencies, which is the whole point of this package.
 */

export type TUID = string;
export type RSID = string;
