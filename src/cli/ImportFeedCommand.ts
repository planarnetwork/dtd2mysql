import AdmZip = require("adm-zip");
import { CLICommand } from "./CLICommand";
import { FeedConfig } from "../../config";
import { FeedFile } from "../feed/file/FeedFile";
import { MySQLSchema } from "../database/MySQLSchema";
import { DatabaseConnection } from "../database/DatabaseConnection";
import * as path from "path";
import { AsyncMySQLTable } from "../database/AsyncMySQLTable";
import * as memoize from "memoized-class-decorator";
import fs = require("fs-extra");
import { MultiRecordFile } from "../feed/file/MultiRecordFile";
import { RecordWithManualIdentifier } from "../feed/record/FixedWidthRecord";
import * as LineByLine from 'line-by-line';

const getExt = filename => path.extname(filename).slice(1).toUpperCase();

/**
 * Imports one of the feeds
 */
export class ImportFeedCommand implements CLICommand {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly files: FeedConfig,
    private readonly tmpFolder: string
  ) {
  }

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
    const file = this.getFeedFile(filename);
    const tables = await this.tables(file);
    const readStream = new LineByLine(this.tmpFolder + filename);

    let counter = 0;
    let counterTotal = 0;

    return new Promise((resolve, reject) => {
      readStream.on("line", line => {
        if (line === "" || line.charAt(0) === "/") return;
        counter++;
        const record = file.getRecord(line);

        if (record) {
          try {
            if (tables[record.name].isOverloaded()) {
              readStream.pause();
              console.log('stream paused');
            }
            tables[record.name].apply(record.extractValues(line), () => {
              readStream.resume();
            });

          } catch (err) {
            reject(`Error processing ${filename} with data ${line}` + err.stack);
          }
        }
        if (counter >= 10000) {
          counterTotal += counter;
          console.log((new Date()).toISOString() + " precessed rows = " + counterTotal);
          counter = 0;
        }

      });

    readStream.on('end', function () {
      console.log(`Finished ${filename}`);
      readStream.close();
      Promise
        .all(Object.values(tables).map(t => t.close()))
        .then(resolve)
        .catch(reject)
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
  async tables(file: FeedFile): Promise<TableIndex> {
    const index = {};

    for (const record of file.recordTypes) {
      index[record.name] = new AsyncMySQLTable(this.db, record.name);
    }

    return index;
  }

  /**
   * Close the underling database connection
   */
  public end(): Promise<void> {
    return this.db.end();
  }

}

type TableIndex = {
  [tableName: string]: AsyncMySQLTable;
}
