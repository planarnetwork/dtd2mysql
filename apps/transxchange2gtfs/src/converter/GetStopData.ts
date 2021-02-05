import { Transform, TransformCallback } from "stream";
import * as fs from "fs";
import { FileDownload } from "../http/FileDownload";
import { Container } from "../Container";
import parse = require("csv-parse");
import stringify = require("csv-stringify");
import * as yauzl from "yauzl";
import ReadableStream = NodeJS.ReadableStream;

export class GetStopData {
  private static readonly STOPS_URL = "https://naptan.app.dft.gov.uk/DataRequest/Naptan.ashx?format=csv";

  constructor(
    private readonly http: FileDownload
  ) { }

  public async update() {
    const transform = new Transform({
      objectMode: true,
      transform: (chunk: any, encoding: string, callback: TransformCallback) => {
        callback(null, [chunk[0], chunk[1], chunk[4], chunk[10], chunk[14], chunk[18], chunk[19], chunk[29], chunk[30]]);
      }
    });

    await this.http.getFile(GetStopData.STOPS_URL, "/tmp/Stops.zip");
    const stream = await this.getStopsCsvStream("/tmp/Stops.zip");

    return new Promise((resolve, reject) => {
      stream
        .pipe(parse()).on("error", reject)
        .pipe(transform).on("error", reject)
        .pipe(stringify()).on("error", reject)
        .pipe(fs.createWriteStream("/tmp/Stops.csv")).on("error", reject)
        .on("finish", resolve);
    });

  }

  private async getStopsCsvStream(filename: string): Promise<ReadableStream> {
    return new Promise((resolve, reject) => {
      yauzl.open(filename, { lazyEntries : true}, (err, zip) => {
        if (err || !zip) {
          return reject(err);
        }

        zip.readEntry();
        zip.on("entry", entry => {
          if (entry.fileName === "Stops.csv") {
            zip.openReadStream(entry, (error, readStream) => {
              if (error || !readStream) {
                return reject(error);
              }

              readStream.on("end", () => zip.readEntry());
              resolve(readStream);
            });
          } else {
            zip.readEntry();
          }
        });
      });
    });
  }

}
