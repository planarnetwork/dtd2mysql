import * as AdmZip from "adm-zip";
import * as fs from 'fs';
import {CLICommand} from "./CLICommand";
import {FeedConfig} from "../../config";
import {FeedFile} from "../feed/file/FeedFile";
import {MySQLSchema} from "../database/MySQLSchema";
import {DatabaseConnection} from "../database/DatabaseConnection";
import * as path from "path";
import {MySQLTable} from "../database/MySQLTable";
import * as memoize from "memoized-class-decorator";
import {MultiRecordFile} from "../feed/file/MultiRecordFile";
import {RecordWithManualIdentifier} from "../feed/record/FixedWidthRecord";
import {MySQLStream, TableIndex} from "../database/MySQLStream";
import * as byline from "byline";
import * as streamToPromise from "stream-to-promise";

const getExt = filename => path.extname(filename).slice(1).toUpperCase();
const readFile = filename => byline.createStream(fs.createReadStream(filename, "utf8"));

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
    await this.doImport(argv[3]);

    return this.end();
  }

  /**
   * Extract the zip, set up the schema and do the inserts
   */
  public async doImport(filePath: string): Promise<void> {
    console.log(`Extracting ${filePath} to ${this.tmpFolder}`);
    fs.rmSync(this.tmpFolder, {recursive: true, force: true});

    new AdmZip(filePath).extractAllTo(this.tmpFolder);

    const zipName = path.basename(filePath);

    // if the file is a not an incremental, reset the database schema
    if (zipName.charAt(4) !== "C") {
      await Promise.all(this.fileArray.map(file => this.setupSchema(file)));
      await this.createLastProcessedSchema();
    }

    if (this.files["CFA"] instanceof MultiRecordFile) {
      await this.setLastScheduleId();
    }

    await Promise.all(
      fs.readdirSync(this.tmpFolder)
        .filter(filename => this.getFeedFile(filename))
        .map(filename => this.processFile(filename))
    );

    if (this.files["CFA"] instanceof MultiRecordFile) {
      await this.removeOrphanStopTimes();
    }

    await this.updateLastFile(zipName);
    fs.rmSync(this.tmpFolder, { recursive: true });
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
  private async createLastProcessedSchema(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS log ( 
        id INT(11) unsigned not null primary key auto_increment, 
        filename VARCHAR(255), 
        processed DATETIME 
      )
    `);
  }

  /**
   * Set the last schedule ID in the CFA record
   */
  private async setLastScheduleId(): Promise<void> {
    const [[lastSchedule]] = await this.db.query<{id : number}>("SELECT id FROM schedule ORDER BY id desc LIMIT 1");
    const lastId = lastSchedule ? lastSchedule.id : 0;
    const cfaFile = this.files["CFA"] as MultiRecordFile;
    const bsRecord = cfaFile.records["BS"] as RecordWithManualIdentifier;

    bsRecord.lastId = lastId;
  }

  private async removeOrphanStopTimes() {
    return Promise.all([
      this.db.query("DELETE FROM stop_time WHERE schedule NOT IN (SELECT id FROM schedule)"),
      this.db.query("DELETE FROM schedule_extra WHERE schedule NOT IN (SELECT id FROM schedule)")
    ]);
  }


  private async updateLastFile(filename: string): Promise<void> {
    await this.db.query("INSERT INTO log VALUES (null, ?, NOW())", [filename]);
  }

  /**
   * Process the records inside the given file
   */
  private async processFile(filename: string): Promise<any> {
    const file = this.getFeedFile(filename);
    const tables = await this.tables(file);
    const tableStream = new MySQLStream(filename, file, tables);
    const stream = readFile(`${this.tmpFolder}/${filename}`).pipe(tableStream);

    try {
      await streamToPromise(stream);

      console.log(`Finished processing ${filename}`);
    }
    catch (err) {
      console.error(`Error processing ${filename}`);
      console.error(err);
    }
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
  private async tables(file: FeedFile): Promise<TableIndex> {
    const index = {};

    for (const record of file.recordTypes) {
      if (!index[record.name]) {
        const db = record.orderedInserts ? await this.db.getConnection() : this.db;

        index[record.name] = new MySQLTable(db, record.name);
      }
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
