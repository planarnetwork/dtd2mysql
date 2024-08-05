import { pipeline, Transform, TransformCallback } from "stream";
import * as fs from "fs";
import { promisify } from "util";
import * as http from "http";
import { https } from "follow-redirects";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

const asyncPipeline = promisify(pipeline);

export class GetStopData {
  private static readonly STOPS_URL = "https://beta-naptan.dft.gov.uk/Download/National/csv";

  public async update() {
    const transform = new Transform({
      objectMode: true,
      transform: (chunk: any, encoding: string, callback: TransformCallback) => {
        callback(null, [chunk[0], chunk[1], chunk[4], chunk[10], chunk[14], chunk[18], chunk[19], chunk[29], chunk[30]]);
      }
    });

    const response = await new Promise(resolve => https.get(GetStopData.STOPS_URL, req => resolve(req)));

    await asyncPipeline(
      response as http.IncomingMessage,
      parse(),
      transform,
      stringify(),
      fs.createWriteStream("/tmp/Stops.csv")
    );
  }

}
