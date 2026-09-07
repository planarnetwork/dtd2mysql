import { Transform, TransformCallback } from "stream";
import { promisify } from "util";
import * as fs from "fs";
import { parse } from "path";
import * as yauzl from "yauzl";
import ReadableStream = NodeJS.ReadableStream;
import { ZipFile } from "yauzl";

const readFile = promisify(fs.readFile);

/**
 * Reads a set of XML or zip files and emits the contents downstream
 */
export class FileStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  /**
   * Pop the next file off the list and emit it. If we've got no more files, close the stream
   */
  public async _transform(file: string, encoding: string, callback: TransformCallback): Promise<void> {
    const extension = parse(file).ext.toLowerCase();

    if (extension  === ".xml") {
      await this.readFile(file);
    }
    else if (extension  === ".zip") {
      await this.readZip(file);
    }
    else {
      this.destroy(Error("Unknown file type: " + file));
    }

    callback();
  }

  private async readFile(file: string): Promise<void> {
    console.log("Processing " + file);
    const contents = await readFile(file, "utf8");
    this.push(contents);
  }

  private async readZip(file: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Processing zip " + file);

      yauzl.open(file, { lazyEntries: true }, (err, zip) => {
        if (err || !zip) {
          return reject(err!);
        }

        this.processZipFile(zip)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  private async readInlineZip(file: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.fromBuffer(file, { lazyEntries: true }, (err, zip) => {
        if (err || !zip) {
          return reject(err!);
        }

        this.processZipFile(zip)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  private async processZipFile(zip: ZipFile): Promise<void> {
    return new Promise<void>(resolve => {
      zip.readEntry();
      zip.on("end", resolve);
      zip.on("entry", entry => {
        const isXml = entry.fileName.toLowerCase().endsWith(".xml");
        const isZip = entry.fileName.toLowerCase().endsWith(".zip");

        if (isXml || isZip) {
          console.log("Processing " + entry.fileName);

          zip.openReadStream(entry, async (error, stream) => {
            if (error || !stream)  {
              console.log(error);
            } else {
              try {
                const buffer = await this.streamToBuffer(stream);

                if (isXml) {
                  this.push(buffer.toString("utf8"));
                } else {
                  await this.readInlineZip(buffer);
                }
              } catch (e) {
                console.log(e);
              }
            }

            zip.readEntry();
          });
        } else {
          console.log("Skipping " + entry.fileName);
          zip.readEntry();
        }
      });
    });
  }

  private streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const chunks = [] as Uint8Array[];

    return new Promise((resolve, reject) => {
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }


}
