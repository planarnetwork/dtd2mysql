import csvWriter = require('csv-write-stream');
import WritableStream = NodeJS.WritableStream;
import * as fs from "fs";

export class FileOutput {

  constructor(
    private readonly baseDir: string
  ) { }

  /**
   * Wrapper around file output library that returns a file as a WritableStream
   */
  public open(filename: string): CSVWritableStream {
    if (!fs.existsSync(this.baseDir)) {
      throw new Error(`Output path ${this.baseDir} does not exist.`);
    }

    const writer = csvWriter();
    writer.pipe(fs.createWriteStream(this.baseDir + filename));

    return writer;
  }

}

interface CSVWritableStream {
  end(): void;
  write(row: any[]): void;
  write(row: object): void;
}