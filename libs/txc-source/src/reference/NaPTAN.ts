import {NaptanRow, eachNaptanRow, parseNaptanRows} from "@gb-transit/naptan";

/**
 * String e.g. 3890D102801
 */
export type ATCOCode = string;

/**
 * One NaPTAN stop, as this conversion uses it.
 *
 * Read by column name. It used to be a nine element `string[]`, sliced out of
 * the national CSV at positions [0,1,4,10,14,18,19,29,30] by a separate download
 * step and then indexed by number all over `StopsStream` and `TransfersStream` -
 * so a column added or moved by the DfT would have silently put a street name in
 * the latitude.
 */
export interface NaptanStopPoint {
  readonly atcoCode: ATCOCode;
  readonly naptanCode: string;
  readonly name: string;
  readonly street: string;
  readonly indicator: string;
  readonly locality: string;
  readonly parentLocality: string;
  /** Kept as text: re-serialising through a number drops trailing digits. */
  readonly longitude: string;
  readonly latitude: string;
}

/**
 * NaPTAN indexed by ATCO code
 */
export type NaPTANIndex = Record<ATCOCode, NaptanStopPoint>;

/**
 * ATCO codes indexed by the locality they are in, which is how a stop's
 * neighbours are found without comparing it to all 400,000 of them.
 */
export type StopLocationIndex = Record<string, ATCOCode[]>;

/**
 * Index a NaPTAN CSV by ATCO code and by locality.
 *
 * Prefer `naptanIndexesFrom`, which streams. This holds the whole CSV and every
 * row of it at once, which for the national dataset is about 600MB more than
 * reading it a row at a time.
 */
export function naptanIndexes(csv: string): [NaPTANIndex, StopLocationIndex] {
  const indexes = emptyIndexes();

  for (const row of parseNaptanRows(csv)) {
    add(indexes, row);
  }

  return indexes;
}

/**
 * Index a NaPTAN CSV by ATCO code and by locality, reading it as it arrives.
 */
export async function naptanIndexesFrom(file: string): Promise<[NaPTANIndex, StopLocationIndex]> {
  const indexes = emptyIndexes();

  await eachNaptanRow(file, row => add(indexes, row));

  return indexes;
}

function emptyIndexes(): [NaPTANIndex, StopLocationIndex] {
  return [{}, {}];
}

function add([byCode, byLocation]: [NaPTANIndex, StopLocationIndex], row: NaptanRow): void {
  const code = row.ATCOCode;

  if (code === undefined || code === "") {
    return;
  }

  const stop: NaptanStopPoint = {
    atcoCode: code,
    naptanCode: row.NaptanCode ?? "",
    name: row.CommonName ?? "",
    street: row.Street ?? "",
    indicator: row.Indicator ?? "",
    locality: row.LocalityName ?? "",
    parentLocality: row.ParentLocalityName ?? "",
    longitude: row.Longitude ?? "",
    latitude: row.Latitude ?? ""
  };

  byCode[code] = stop;

  const location = stop.parentLocality || stop.locality;

  (byLocation[location] ||= []).push(code);
}
