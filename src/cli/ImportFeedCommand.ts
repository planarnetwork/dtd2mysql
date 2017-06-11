
import {CLICommand, Result, Success} from "./CLICommand";

export class ImportFeedCommand implements CLICommand {

  constructor(
    private readonly files: FileMap
  ) { }

  run(argv: string[]): Promise<Result> {
    // extract files

    const promises = this.files.map(file => {
      //file.getRecords().map(record => {
      //  this.createSchemaCommand(record));
      // });
    })

    // await files and schema.

    //  this.importCommand(record)

    return Promise.resolve(new Success());
  }

}