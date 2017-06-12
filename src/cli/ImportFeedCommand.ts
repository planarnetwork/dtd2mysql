import Bluebird = require("bluebird");
import AdmZip = require("adm-zip");
import {CLICommand} from "./CLICommand";
import {FeedConfig} from "../../config";
import {FeedFile} from "../feed/file/FeedFile";
import {MySQLSchema} from "../database/MySQLSchema";
import {DatabaseConnection} from "../database/DatabaseConnection";
import * as path from "path";
import * as readline from "readline";
import {MySQLTable} from "../database/MySQLTable";
import memoize from "memoized-class-decorator";

const fs: any = Bluebird.promisifyAll(require("fs"));
const getExt = filename => path.extname(filename).slice(1);
const readFile = filename => readline.createInterface({ input: fs.createReadStream(filename) });

/**
 * Imports one of the feeds
 */
export class ImportFeedCommand implements CLICommand {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly files: FeedConfig,
    private readonly tmpFolder: string
  ) { }

  private get fileArray(): FeedFile[] {
    return Object.values(this.files);
  }

  /**
   * Setup the schemas, extract the zip, import the files
   */
  public async run(argv: string[]): Promise<void> {
    const schemaSetup = Promise.all(this.fileArray.map(file => this.setupSchema(file)));

    console.log(`Extracting ${argv[3]} to ${this.tmpFolder}`);
    new AdmZip(argv[3]).extractAllTo(this.tmpFolder);

    const [files] = await Promise.all([fs.readdirAsync(this.tmpFolder), schemaSetup]);
    const inserts =
      files
        .filter(filename => this.getFeedFile(filename))
        .map(filename => this.processFile(filename));


    try {
      console.log("Waiting for inserts to complete...");
      await Promise.all(inserts);
      await this.db.end();
      console.log("Done");
    }
    catch (err) {
      console.error(err.stack);
    }
  }

  /**
   * Drop and recreate the tables
   */
  private async setupSchema(file: FeedFile): Promise<void> {
    await Promise.all(this.schemas(file).map(schema => schema.dropSchema()));
    await Promise.all(this.schemas(file).map(schema => schema.createSchema()));
  }

  /**
   * Process the records inside the given file
   */
  private processFile(filename: string): Promise<any> {
    console.log(`Processing ${filename}`);

    const file = this.getFeedFile(filename);
    const tables = this.tables(file);
    const readStream = readFile(this.tmpFolder + filename);

    readStream.on("line", line => {
      if (line === '' || line.charAt(0) === '/') return;

      try {
        const record = file.getRecord(line);
        const values = record.extractValues(line);

        tables[record.name].insert(values);
      }
      catch (err) {
        console.error(`Error processing ${filename} with data ${line}`);
      }
    });

    // return a promise that is fulfilled the tables have finished their inserts
    return new Promise((resolve, reject) => {
      readStream.on('close', () => resolve(Promise.all(Object.values(tables).map(t => t.close()))));
      readStream.on('SIGINT', () => reject());
    });
  }

  @memoize
  private getFeedFile(filename: string): FeedFile {
    return this.files[getExt(filename)];
  }

  @memoize
  private schemas(file: FeedFile): MySQLSchema[] {
    return file.recordTypes.map(record => new MySQLSchema(this.db, record));
  }

  @memoize
  private tables(file: FeedFile): TableIndex {
    return file.recordTypes.reduce((records, record) => {
      records[record.name] = new MySQLTable(this.db, record.name);

      return records;
    }, {});
  }

}

type TableIndex = {
  [tableName: string]: MySQLTable;
}