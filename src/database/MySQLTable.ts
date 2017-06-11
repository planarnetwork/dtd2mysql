
import {DatabaseConnection} from "./DatabaseConnection";

/**
 * Stateful class provides access to a MySQL table that acts as buffer for inserts.
 */
export class MySQLTable {
  private readonly promiseBuffer: Promise<void>[] = [];
  private inserts: MySQLRow[] = [];

  constructor(
    private readonly db: DatabaseConnection,
    private readonly tableName: string,
    private readonly flushLimit: number = 10000
  ) {}

  /**
   * Insert the given row to the table
   */
  public insert(row: MySQLRow): void {
    this.inserts.push(row);

    if (this.inserts.length >= this.flushLimit) {
      this.flush();
    }
  }

  /**
   * Flush the table
   */
  private flush(): void {
    const promise = this.db.query(`INSERT INTO \`${this.tableName}\` VALUES ?`, [this.inserts]);

    this.promiseBuffer.push(promise);
    this.inserts = [];
  }

  /**
   * Truncate the table
   */
  public truncate(): Promise<void> {
    return this.db.query(`TRUNCATE \`${this.tableName}\``);
  }

  /**
   * Flush and return all promises
   */
  public close(): Promise<void[]> {
    this.flush();

    return Promise.all(this.promiseBuffer);
  }

}

/**
 * Value that can be inserted into MySQL
 */
export type MySQLValue = null | number | string;

/**
 * Row of MySQL values
 */
export type MySQLRow = MySQLValue[];
