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
const getExt = filename => path.extname(filename).slice(1).toUpperCase();
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
   * Do the import and then shut down the connection pool
   */
  public async run(argv: string[]): Promise<void> {
    try {
      await this.doImport(argv[3]);
    }
    catch (err) {
      console.error(err);
    }

    try {
      await this.db.end();
    }
    catch (err) {}
    console.log("Done");
  }

  /**
   * Extract the zip, set up the schema and do the inserts
   */
  private async doImport(filename: string): Promise<any> {
    console.log(`Extracting ${filename} to ${this.tmpFolder}`);
    new AdmZip(filename).extractAllTo(this.tmpFolder);

    const schemaSetup = this.fileArray.map(file => this.setupSchema(file));
    const [files] = await Promise.all([fs.readdirAsync(this.tmpFolder), ...schemaSetup]);
    const inserts =
      files
        .filter(filename => this.getFeedFile(filename))
        .map(filename => this.processFile(filename));

    return Promise.all(inserts);
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
    return new Promise((resolve, reject) => {
      const file = this.getFeedFile(filename);
      const tables = this.tables(file);
      const readStream = readFile(this.tmpFolder + filename);

      readStream.on("line", line => {
        if (line === '' || line.charAt(0) === '/') return;

        const record = file.getRecord(line);

        if (record) {
          try {
            tables[record.name].insert(record.extractValues(line));
          }
          catch (err) {
            reject(`Error processing ${filename} with data ${line}` + err.stack);
          }
        }
      });

      readStream.on('close', () => console.log(`Finished ${filename}`) || resolve(Promise.all(Object.values(tables).map(t => t.close()))));
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