
import {DatabaseConnection} from "./DatabaseConnection";
import {ParsedRecord, RecordAction} from "../feed/record/Record";

/**
 * Stateful class that provides access to a MySQL table and acts as buffer for inserts.
 */
export class MySQLTable {
  private readonly promiseBuffer: Promise<any>[] = [];

  protected readonly buffer = {
    [RecordAction.Insert]: [] as ParsedRecord[],
    [RecordAction.Update]: [] as ParsedRecord[],
    [RecordAction.Delete]: [] as ParsedRecord[],
  };

  constructor(
    private readonly db: DatabaseConnection,
    private readonly tableName: string,
    private readonly flushLimit: number = 5000
  ) {}

  /**
   * Insert the given row to the table
   */
  public async apply(row: ParsedRecord): Promise<void> {
    this.buffer[row.action].push(row);

    if (this.buffer[row.action].length >= this.flushLimit) {
      await this.flush(row.action);
    }
  }

  /**
   * Flush the table
   */
  protected flush(type: RecordAction): void {
    if (this.buffer[type].length === 0) {
      return;
    }

    const promise = this.queryWithRetry(type, this.buffer[type]);

    this.promiseBuffer.push(promise);
    this.buffer[type] = [];
  }

  /**
   * Flush and return all promises
   */
  public async close(): Promise<any> {
    this.flush(RecordAction.Delete);
    this.flush(RecordAction.Update);
    this.flush(RecordAction.Insert);

    await Promise.all(this.promiseBuffer);
  }

  /**
   * Query with retry. Sometimes locking errors occur
   */
  protected async queryWithRetry(type: RecordAction, rows: ParsedRecord[], numRetries: number = 3): Promise<void> {
    try {
      await this.query(type, rows);
    }
    catch (err) {
      if (err.errno === 1213 && numRetries > 0) {
        return this.queryWithRetry(type, rows, numRetries - 1);
      }
      else {
        throw err;
      }
    }
  }

  protected query(type: RecordAction, rows: ParsedRecord[]): Promise<void> {
    const rowValues = rows.map(r => Object.values(r.values));

    switch (type) {
      case RecordAction.Insert:
        return this.db.query(`INSERT IGNORE INTO \`${this.tableName}\` VALUES ?`, [rowValues]);
      case RecordAction.Update:
        return this.db.query(`REPLACE INTO \`${this.tableName}\` VALUES ?`, [rowValues]);
      case RecordAction.Delete:
        return this.db.query(`DELETE FROM \`${this.tableName}\` WHERE (${this.getDeleteSQL(rows)})`, [].concat.apply([], rowValues));
      default:
        throw new Error("Unknown record action: " + type);
    }
  }

  private getDeleteSQL(rows: ParsedRecord[]): string {
    return rows.map(row => Object.keys(row.values).map(k => `\`${k}\` = ?`).join(" AND ")).join(") OR (");
  }
}

