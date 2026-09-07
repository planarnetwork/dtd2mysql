import {Parser} from "csv-parse";

/**
 * Loads the NaPTAN data from the locally stored zip file
 */
export class NaPTANFactory {

  constructor(
    private csvStream: Parser,
  ) {}

  /**
   * Open the zip, extract the CSV, send it to the CSV parser, then return the results indexed by ATCO code
   */
  public getIndexes(): Promise<[NaPTANIndex, StopLocationIndex]> {
    return new Promise((resolve, reject) => {
      const atocIndex: NaPTANIndex = {};
      const locationIndex: StopLocationIndex = {};

      this.csvStream.on("data", data => {
        const location = data[6] || data[5];

        locationIndex[location] = locationIndex[location] || [];
        locationIndex[location].push(data[0]);

        atocIndex[data[0]] = data;
      });

      this.csvStream.on("end", () => resolve([atocIndex, locationIndex]));
      this.csvStream.on("error", reject);
    });
  }

}

/**
 * String e.g. 3890D102801
 */
export type ATCOCode = string;

/**
 * NaPTAN indexed by ATCO code
 */
export type NaPTANIndex = Record<ATCOCode, string[]>;

/**
 * ATCO code indexed by location
 */
export type StopLocationIndex = Record<ATCOCode, string[]>;
