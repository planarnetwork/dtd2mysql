import {Parser} from "csv-parse";

/**
 * String e.g. 3890D102801
 */
export type ATCOCode = string;

/**
 * NaPTAN indexed by ATCO code
 */
export type NaPTANIndex = Record<ATCOCode, string[]>;

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
  public getIndex(): Promise<NaPTANIndex> {
    return new Promise((resolve, reject) => {
      const index: NaPTANIndex = {};

      this.csvStream.on("data", data => index[data[0]] = data);
      this.csvStream.on("end", () => resolve(index));
      this.csvStream.on("error", reject);
    });
  }

}
