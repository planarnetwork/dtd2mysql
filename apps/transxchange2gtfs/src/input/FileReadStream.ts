import {Transform, TransformCallback} from "stream";
import {promisify} from "util";
import * as fs from "fs";

const readFile = promisify(fs.readFile);

/**
 * Transforms a filename to a file
 */
export class FileReadStream extends Transform {

  /**
   * Read the file and send it downstream
   */
  async _transform(chunk: string, encoding: string, callback: TransformCallback): Promise<void> {
    try {
      const contents = await readFile(chunk);

      callback(undefined, contents);
    }
    catch (err) {
      callback(err);
    }
  }

}
