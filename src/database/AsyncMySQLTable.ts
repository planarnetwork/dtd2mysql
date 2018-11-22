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

  /**
   * Insert the given row to the table
   */
  public async apply(row: ParsedRecord): Promise<void> {
    this.buffer[row.action].push(row);

    if (this.buffer[row.action].length >= this.flushLimit) {
      console.log("running flushes = " + this.runningFlushes);
      while (this.runningFlushes >= this.runningFlushesLimit) {
        await this.sleep(100);
      }
      this.flush(row.action);
    }
  }

  protected flush(type: RecordAction): void {
    if (this.buffer[type].length === 0) {
      return;
    }
    this.queryWithRetry(type, this.buffer[type]).then(() => {
      this.runningFlushes--;
    });
    this.runningFlushes++;

    this.buffer[type] = [];
  }

  private sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
}
