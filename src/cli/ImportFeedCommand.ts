import AdmZip = require("adm-zip");
import {CLICommand} from "./CLICommand";
import {FeedConfig} from "../../config";
import {FeedFile} from "../feed/file/FeedFile";
import {MySQLSchema} from "../database/MySQLSchema";
import {DatabaseConnection} from "../database/DatabaseConnection";
import * as path from "path";
import * as readline from "readline";
import {MySQLTable} from "../database/MySQLTable";
import * as memoize from "memoized-class-decorator";
import fs = require("fs-extra");

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
      process.exit(-1);
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
  private async doImport(filePath: string): Promise<void> {
    console.log(`Extracting ${filePath} to ${this.tmpFolder}`);
    fs.emptyDirSync(this.tmpFolder);

    new AdmZip(filePath).extractAllTo(this.tmpFolder);

    const filename = path.basename(filePath);

    // if the file is a full refresh (or routeing guide), reset the database schema
    if (filename.charAt(4) === "F" || filename.startsWith("RJRG")) {
      await Promise.all(this.fileArray.map(file => this.setupSchema(file)));
      await this.createLastProcessedSchema();
    }

    const inserts =
      fs.readdirSync(this.tmpFolder)
        .filter(filename => this.getFeedFile(filename))
        .map(filename => this.processFile(filename));

    await Promise.all(inserts);
    await this.updateLastFile(filename);
  }

  /**
   * Drop and recreate the tables
   */
  private async setupSchema(file: FeedFile): Promise<void> {
    await Promise.all(this.schemas(file).map(schema => schema.dropSchema()));
    await Promise.all(this.schemas(file).map(schema => schema.createSchema()));
  }

  /**
   * Create the last_file table (if it doesn't already exist)
   */
  private createLastProcessedSchema(): Promise<void> {
    return this.db.query(`
      CREATE TABLE IF NOT EXISTS log ( 
        id INT(11) unsigned not null primary key auto_increment, 
        filename VARCHAR(12), 
        processed DATETIME 
      )
    `);
  }

  private updateLastFile(filename: string): Promise<void> {
    return this.db.query("INSERT INTO log VALUES (null, ?, NOW())", [filename]);
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

      readStream.on('SIGINT', reject);
      readStream.on('close', () => {
        console.log(`Finished ${filename}`);

        Promise
          .all(Object.values(tables).map(t => t.close()))
          .then(resolve)
          .catch(reject);
      });
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