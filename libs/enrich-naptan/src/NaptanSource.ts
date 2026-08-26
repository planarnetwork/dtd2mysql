import * as fs from "node:fs";
import * as path from "node:path";
import {parse} from "csv-parse/sync";
import {NaptanEntrance, NaptanStop} from "./Naptan";

/**
 * The DfT's open data endpoint. `stopTypes` is accepted and ignored - the
 * response is the whole national dataset, around 100 MB - so the filtering
 * happens here.
 */
const NAPTAN_CSV = "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv";

/**
 * A rail record: `9100` and then the TIPLOC.
 */
const RAIL_PREFIX = "9100";


/**
 * Read NaPTAN, from a cached copy if there is one.
 *
 * A hundred megabytes is not something to download on every build, and a
 * nightly that fails because the DfT is briefly down has failed for no good
 * reason. The cache is written once and reused until somebody deletes it;
 * NaPTAN changes slowly and a stale coordinate is better than no build.
 */
export function naptanFromApi(cacheDirectory: string, maxAgeDays = 30): () => Promise<readonly NaptanStop[]> {
  return async () => parseNaptan(await csvFile(cacheDirectory, maxAgeDays));
}

/**
 * The NaPTAN CSV, downloaded if there is no fresh copy.
 */
async function csvFile(cacheDirectory: string, maxAgeDays: number): Promise<string> {
  {
    const file = path.join(cacheDirectory, "naptan.csv");

    if (!fresh(file, maxAgeDays)) {
      fs.mkdirSync(cacheDirectory, {recursive: true});
      console.log(`Downloading NaPTAN to ${file}`);

      const response = await fetch(NAPTAN_CSV);

      if (!response.ok) {
        throw new Error(`NaPTAN returned ${response.status} ${response.statusText}`);
      }

      // Written under a temporary name and moved, so an interrupted download
      // does not leave a truncated file that looks like a good cache.
      const partial = `${file}.partial`;

      fs.writeFileSync(partial, Buffer.from(await response.arrayBuffer()));
      fs.renameSync(partial, file);
    }

    return fs.readFileSync(file, "utf8");
  }
}

/**
 * The entrances out of the same cached download.
 *
 * Separate from `naptanFromApi` so an enricher takes only what it needs, and
 * sharing the cache so this is one file on disk however many read it.
 */
export function entrancesFromApi(cacheDirectory: string, maxAgeDays = 30): () => Promise<readonly NaptanEntrance[]> {
  return async () => parseEntrances(await csvFile(cacheDirectory, maxAgeDays));
}

function coordinate(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function fresh(file: string, maxAgeDays: number): boolean {
  if (!fs.existsSync(file)) {
    return false;
  }

  const age = Date.now() - fs.statSync(file).mtimeMs;

  return age < maxAgeDays * 24 * 60 * 60 * 1000;
}

/**
 * The rail stations out of a NaPTAN CSV.
 *
 * Separate from the download so the mini fixture can drive an enrichment with
 * no network, and so a malformed row is a parsing problem rather than a
 * mysterious absence later.
 */
export function parseEntrances(csv: string): NaptanEntrance[] {
  const entrances: NaptanEntrance[] = [];

  for (const row of rows(csv)) {
    if (row.StopType !== "RSE") {
      continue;
    }

    const latitude = coordinate(row.Latitude);
    const longitude = coordinate(row.Longitude);

    // 334 entrances ship with no position. A door that could be anywhere is
    // not a door, and unlike a station there is nothing else to fall back on.
    if (latitude === undefined || longitude === undefined) {
      continue;
    }

    entrances.push({
      atco: row.ATCOCode ?? "",
      name: row.CommonName ?? "",
      latitude,
      longitude,
      indicator: row.Indicator ?? "",
      street: row.Street ?? "",
      active: row.Status !== "inactive"
    });
  }

  return entrances;
}

function rows(csv: string): {[column: string]: string}[] {
  return parse(csv, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true
  });
}

export function parseNaptan(csv: string): NaptanStop[] {
  const stops: NaptanStop[] = [];

  for (const row of rows(csv)) {
    if (row.StopType !== "RLY" || !row.ATCOCode?.startsWith(RAIL_PREFIX)) {
      continue;
    }

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
      tiploc: row.ATCOCode.slice(RAIL_PREFIX.length),
      name: row.CommonName ?? "",
      latitude,
      longitude,
      locality: row.LocalityName ?? "",
      active: row.Status !== "inactive"
    });
  }

  return stops;
}
