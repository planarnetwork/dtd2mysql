import csvWriter from 'csv-write-stream';
import * as fs from "fs";
import {GTFSOutput} from "./GTFSOutput";
import {Writable} from "stream";

export class FileOutput implements GTFSOutput {

  /**
   * Wrapper around file output library that returns a file as a WritableStream
   */
  public open(filename: string): Writable {
    const writer = csvWriter();
    writer.pipe(fs.createWriteStream(filename));

    return writer;
  }

  /**
   * Nothing to do, files already closed
   */
  public end(): void {

  }

}
