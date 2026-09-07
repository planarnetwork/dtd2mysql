import {NaptanRow, naptanCsv, parseNaptanRows} from "@gb-transit/naptan";
import {NaptanStop} from "./Naptan";

/**
 * A rail record: `9100` and then the TIPLOC.
 */
const RAIL_PREFIX = "9100";

/**
 * Read NaPTAN, from a cached copy if there is one, and keep the rail stations.
 */
export function naptanFromApi(cacheDirectory: string, maxAgeDays = 30): () => Promise<readonly NaptanStop[]> {
  const csv = naptanCsv(cacheDirectory, maxAgeDays);

  return async () => parseNaptan(await csv());
}

function coordinate(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Whether a NaPTAN row describes a rail station.
 */
export function isRailStop(row: NaptanRow): boolean {
  return row.StopType === "RLY" && !!row.ATCOCode?.startsWith(RAIL_PREFIX);
}

/**
 * The rail stations out of a NaPTAN CSV.
 *
 * Separate from the download so the mini fixture can drive an enrichment with
 * no network, and so a malformed row is a parsing problem rather than a
 * mysterious absence later.
 */
export function parseNaptan(csv: string): NaptanStop[] {
  const stops: NaptanStop[] = [];

  for (const row of parseNaptanRows(csv, isRailStop)) {
    const latitude = coordinate(row.Latitude);
    const longitude = coordinate(row.Longitude);

    // NaPTAN carries rail records with the position left blank - Bond Street,
    // Tottenham Court Road and Barking Riverside among them. Such a record is
    // worse than no record, because it overwrites a coordinate the feed already
    // had with nothing. `Number("")` is 0 rather than NaN, so an empty field
    // has to be rejected before it is converted, or three London stations end
    // up in the Gulf of Guinea.
    if (latitude === undefined || longitude === undefined) {
      continue;
    }

    stops.push({
      tiploc: row.ATCOCode!.slice(RAIL_PREFIX.length),
      name: row.CommonName ?? "",
      latitude,
      longitude,
      locality: row.LocalityName ?? "",
      active: row.Status !== "inactive"
    });
  }

  return stops;
}
