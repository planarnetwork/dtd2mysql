import AdmZip from "adm-zip";
import * as fs from 'fs';
import {CLICommand} from "./CLICommand";
import {FeedConfig} from "@gb-transit/dtd-schema";
import {FeedFile, MultiRecordFile, Record as FeedRecord} from "@gb-transit/feed-parser";
import {MySQLSchema} from "../database/MySQLSchema";
import {DatabaseConnection} from "../database/DatabaseConnection";
import * as path from "path";
import {MySQLTable} from "../database/MySQLTable";
import memoize from "memoized-class-decorator";
import {MySQLStream, TableIndex} from "../database/MySQLStream";
import byline from "byline";
import {finished} from "node:stream/promises";

const getExt = (filename: string) => path.extname(filename).slice(1).toUpperCase();
const readFile = (filename: string) => byline.createStream(fs.createReadStream(filename, "utf8"));

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

    await this.restoreIdCounters();

    await Promise.all(
      fs.readdirSync(this.tmpFolder)
        .filter(filename => this.getFeedFile(filename))
        .map(filename => this.processFile(filename))
    );

    await this.removeOrphanStopTimes();

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
   * Continue every generated id from where the database left off.
   *
   * A record that makes its own id counts from zero on each run, and `id` is the
   * primary key, so `INSERT IGNORE` silently drops every row whose id an earlier
   * feed already used. Only the `schedule` counter was ever restored, which is
   * why an incremental's schedules landed and their stop times did not: 5,354
   * schedules from the two reference incrementals had no stop times at all, and
   * the incrementals' ZTR was discarded whole.
   *
   * Every record with a counter is restored, not the ones that were noticed. The
   * name of a record is the name of its table, so there is nothing to keep in
   * step. A full refresh drops the tables first, so the max is null and this is
   * a no-op.
   */
  private async restoreIdCounters(): Promise<void> {
    const counted = Object.values(this.files)
      .flatMap(file => file.recordTypes)
      .filter((record): record is FeedRecord & {lastId: number} => "lastId" in record);

    const seen = new Set<string>();

    await Promise.all(counted.map(async record => {
      if (seen.has(record.name)) {
        return;
      }

      seen.add(record.name);

      const [[row]] = await this.db.query<{id: number | null}>(
        `SELECT MAX(id) AS id FROM \`${record.name}\``
      );

      record.lastId = row?.id ?? 0;
    }));
  }

  /**
   * Stop times whose schedule is gone.
   *
   * A z-train that a later feed revises is REPLACEd, which means the old row is
   * deleted and the new one takes a new id - so the stop times that pointed at
   * the old id belong to nothing. The same is true of a schedule an incremental
   * withdraws.
   */
  private async removeOrphanStopTimes() {
    return Promise.all([
      this.db.query("DELETE FROM stop_time WHERE schedule NOT IN (SELECT id FROM schedule)"),
      this.db.query("DELETE FROM z_stop_time WHERE z_schedule NOT IN (SELECT id FROM z_schedule)"),
      this.db.query("DELETE FROM schedule_extra WHERE schedule NOT IN (SELECT id FROM schedule)")
    ]);
  }


  private async updateLastFile(filename: string): Promise<void> {
    await this.db.query("INSERT INTO log VALUES (null, ?, NOW())", [filename]);
  }

  /**
   * Process the records inside the given file
   */
  private async processFile(filename: string): Promise<void> {
    const file = this.getFeedFile(filename);
    const tables = await this.tables(file);
    const tableStream = new MySQLStream(filename, file, tables);
    const stream = readFile(`${this.tmpFolder}/${filename}`).pipe(tableStream);

    try {
      await finished(stream);

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
    const index: TableIndex = {};

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
