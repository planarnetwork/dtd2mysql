import {Transform, TransformCallback} from "stream";
import * as AdmZip from "adm-zip";

/**
 * Transforms a filename of a zip into a stream of uncompressed files
 */
export class ZipReadStream extends Transform {

  /**
   * Read the given zip file and send each of it's files downstream as an uncompressed string
   */
  _transform(chunk: string, encoding: string, callback: TransformCallback): void {
    const zip = new AdmZip(chunk);

    for (const entry of zip.getEntries()) {
      this.push(entry.getData().toString("utf8"));
    }

    callback();
  }

}
