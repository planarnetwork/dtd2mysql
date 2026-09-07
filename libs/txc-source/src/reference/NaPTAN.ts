import {parseNaptanRows} from "@gb-transit/naptan";

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
 */
export function naptanIndexes(csv: string): [NaPTANIndex, StopLocationIndex] {
  const byCode: NaPTANIndex = {};
  const byLocation: StopLocationIndex = {};

  for (const row of parseNaptanRows(csv)) {
    const code = row.ATCOCode;

    if (code === undefined || code === "") {
      continue;
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

  return [byCode, byLocation];
}
