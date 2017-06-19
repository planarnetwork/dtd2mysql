
import {DatabaseConnection} from "./DatabaseConnection";

/**
 * Stateful class that provides access to a MySQL table and acts as buffer for inserts.
 */
export class MySQLTable {
  private readonly promiseBuffer: Promise<any>[] = [];
  private inserts: MySQLRow[] = [];

  constructor(
    private readonly db: DatabaseConnection,
    private readonly tableName: string,
    private readonly flushLimit: number = 5000
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
    if (this.inserts.length === 0) return;

    const promise = this.db.query(`INSERT INTO \`${this.tableName}\` VALUES ?`, [this.inserts]);

    this.promiseBuffer.push(promise);
    this.inserts = [];
  }

  /**
   * Flush and return all promises
   */
  public close(): Promise<any> {
    this.flush();

    return Promise.all(this.promiseBuffer);
  }

}

/**
 * Value that can be inserted into MySQL
 */
export type MySQLValue = null | number | string;

/**
 * RestrictionRow of MySQL values
 */
export type MySQLRow = MySQLValue[];
