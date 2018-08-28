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
import {MultiRecordFile} from "../feed/file/MultiRecordFile";
import {RecordWithManualIdentifier} from "../feed/record/FixedWidthRecord";

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

    return this.end();
  }

  /**
   * Extract the zip, set up the schema and do the inserts
   */
  public async doImport(filePath: string): Promise<void> {
    console.log(`Extracting ${filePath} to ${this.tmpFolder}`);
    fs.emptyDirSync(this.tmpFolder);

    new AdmZip(filePath).extractAllTo(this.tmpFolder);

    const zipName = path.basename(filePath);

    // if the file is a not an incremental, reset the database schema
    if (zipName.charAt(4) !== "C") {
      await Promise.all(this.fileArray.map(file => this.setupSchema(file)));
      await this.createLastProcessedSchema();
    }

    if (this.files["CFA"] instanceof MultiRecordFile) {
      await this.setLastScheduleId();
      this.ensureALFExists(zipName.substring(0, zipName.length - 4));
    }

    const files = fs.readdirSync(this.tmpFolder).filter(filename => this.getFeedFile(filename));

    for (const filename of files) {
      await this.processFile(filename);
    }

    await this.updateLastFile(zipName);
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

  /**
   * Set the last schedule ID in the CFA record
   */
  private async setLastScheduleId(): Promise<void> {
    const [[lastSchedule]] = await this.db.query("SELECT id FROM schedule ORDER BY id desc LIMIT 1");
    const lastId = lastSchedule ? lastSchedule.id : 0;

    (<RecordWithManualIdentifier>(<MultiRecordFile>this.files["CFA"]).records["BS"]).lastId = lastId;
  }

  private ensureALFExists(filename): void {
    if (!fs.existsSync(this.tmpFolder + filename + ".alf")) {
      fs.copyFileSync(__dirname + "/../../config/timetable/data/fixed.alf", this.tmpFolder + "fixed.alf");
    }
  }

  private updateLastFile(filename: string): Promise<void> {
    return this.db.query("INSERT INTO log VALUES (null, ?, NOW())", [filename]);
  }

  /**
   * Process the records inside the given file
   */
  private async processFile(filename: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const file = this.getFeedFile(filename);
      const tables = this.tables(file);
      const readStream = readFile(this.tmpFolder + filename);

      readStream.on("line", line => {
        if (line === '' || line.charAt(0) === '/') return;

        const record = file.getRecord(line);

        if (record) {
          try {
            tables[record.name].apply(record.extractValues(line));
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

  /**
   * Close the underling database connection
   */
  public end(): Promise<void> {
    return this.db.end();
  }

}

type TableIndex = {
  [tableName: string]: MySQLTable;
}
