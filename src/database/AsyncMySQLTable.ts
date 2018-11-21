import { DatabaseConnection } from "./DatabaseConnection";
import { ParsedRecord, RecordAction } from "../feed/record/Record";
import { MySQLTable } from './MySQLTable';

/**
 * Stateful class that provides access to a MySQL table and acts as buffer for inserts.
 */
export class AsyncMySQLTable extends MySQLTable {

  constructor(
    db: DatabaseConnection,
    tableName: string,
    flushLimit: number = 20000
  ) {
    super(db, tableName, flushLimit);
  }

  /**
   * Insert the given row to the table
   */
  public async apply(row: ParsedRecord): Promise<void> {
    this.buffer[row.action].push(row);

    if (this.buffer[row.action].length >= this.flushLimit) {
      await this.flush(row.action);
    }
  }

  protected async flush(type: RecordAction): Promise<void> {
    if (this.buffer[type].length === 0) {
      return;
    }

    await this.queryWithRetry(type, this.buffer[type]);
    this.buffer[type] = [];
  }
}

