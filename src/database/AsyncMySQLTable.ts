import { DatabaseConnection } from "./DatabaseConnection";
import { ParsedRecord, RecordAction } from "../feed/record/Record";
import { MySQLTable } from './MySQLTable';

/**
 * Stateful class that provides access to a MySQL table and acts as buffer for inserts.
 */
export class AsyncMySQLTable extends MySQLTable {

  private runningFlushes = 0;

  constructor(
    db: DatabaseConnection,
    tableName: string,
    flushLimit: number = 20000,
    private readonly runningFlushesLimit: number = 20
  ) {
    super(db, tableName, flushLimit);
  }

  public isOverloaded(): boolean  {
    return this.runningFlushes >= this.runningFlushesLimit;
  }

  /**
   * Insert the given row to the table
   */
  public apply(row: ParsedRecord, flushCallback?): void {
    this.buffer[row.action].push(row);

    if (this.buffer[row.action].length >= this.flushLimit) {
      console.log("running flushes = " + this.runningFlushes);
      this.flush(row.action, flushCallback);
    }
  }

  protected flush(type: RecordAction, flushCallback?): void {
    if (this.buffer[type].length === 0) {
      return;
    }
    this.queryWithRetry(type, this.buffer[type]).then(() => {
      this.runningFlushes--;
      if(flushCallback) flushCallback();
      console.log("flush done ");
    });
    this.runningFlushes++;

    this.buffer[type] = [];
  }

}
