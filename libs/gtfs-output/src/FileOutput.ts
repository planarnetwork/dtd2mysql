import csvWriter from 'csv-write-stream';
import * as fs from "fs";
import {GTFSOutput} from "@gb-transit/gtfs";
import {finished} from "node:stream/promises";
import {Writable} from "stream";

export class FileOutput implements GTFSOutput {

  private readonly files: Promise<void>[] = [];

  /**
   * A CSV writer piped into a file.
   *
   * The writer is what the build holds, and it finishes as soon as it has
   * handed its last row on - which is not when the row is on disk. The file at
   * the other end of the pipe is the thing to wait for, so it is collected here
   * and awaited by end().
   */
  public open(filename: string): Writable {
    const writer = csvWriter();
    const file = fs.createWriteStream(filename);

    writer.pipe(file);
    this.files.push(finished(file));

    return writer;
  }

  public write(filename: string, contents: string): void {
    fs.writeFileSync(filename, contents);
  }

  public async end(): Promise<void> {
    await Promise.all(this.files);
  }

}
