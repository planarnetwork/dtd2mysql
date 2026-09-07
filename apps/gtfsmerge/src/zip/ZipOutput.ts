import { exec } from "child_process";

export class ZipOutput {

  constructor(
    private readonly tempFolder: string
  ) {}

  public async write(outputFile: string): Promise<void> {
    console.log("Writing " + outputFile);
    await exec(`zip -j ${outputFile} ${this.tempFolder}*.txt`, { maxBuffer: Number.MAX_SAFE_INTEGER });
  }

}
