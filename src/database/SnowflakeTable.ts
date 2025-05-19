import { DatabaseConnection } from "./DatabaseConnection";
import { ParsedRecord, RecordAction } from "../feed/record/Record";

export class SnowflakeTable {
  private readonly buffer = {
    [RecordAction.Insert]: [] as ParsedRecord[],
    [RecordAction.Update]: [] as ParsedRecord[],
    [RecordAction.Delete]: [] as ParsedRecord[],
    [RecordAction.DelayedInsert]: [] as ParsedRecord[],
  };

  constructor(
    private readonly db: DatabaseConnection,
    private readonly tableName: string,
    private readonly flushLimit: number = 5000
  ) {}

  public async apply(row: ParsedRecord): Promise<void> {
    this.buffer[row.action].push(row);

    if (row.action === RecordAction.DelayedInsert) {
      this.buffer[RecordAction.Delete].push({ ...row, action: RecordAction.Delete });
    }
    else if (this.buffer[row.action].length >= this.flushLimit) {
      return this.flush(row.action);
    }
  }

  private async flush(type: RecordAction): Promise<void> {
    const rows = this.buffer[type];

    if (rows.length > 0) {
      this.buffer[type] = [];
      return this.queryWithRetry(type, rows);
    }
  }

  public async close(): Promise<any> {
    await Promise.all([
      this.flush(RecordAction.Delete),
      this.flush(RecordAction.Update),
      this.flush(RecordAction.Insert)
    ]);

    await this.flush(RecordAction.DelayedInsert);

    if (this.db.release) {
      await this.db.release();
    }
  }

  private async queryWithRetry(type: RecordAction, rows: ParsedRecord[], numRetries: number = 3): Promise<void> {
    try {
      await this.query(type, rows);
    }
    catch (err) {
      if (numRetries > 0) {
        // Snowflake specific error handling
        if (err.code === '390189' || err.code === '390190') { // Lock timeout errors
          return this.queryWithRetry(type, rows, numRetries - 1);
        }
      }
      throw err;
    }
  }

  private async query(type: RecordAction, rows: ParsedRecord[]): Promise<void> {
    const rowValues = rows.map(r => Object.values(r.values));

    switch (type) {
      case RecordAction.Insert:
      case RecordAction.DelayedInsert:
        // Snowflake uses MERGE for upsert operations
        await this.db.query(
          `MERGE INTO "${this.tableName}" target
       USING (SELECT * FROM TABLE(FLATTEN(input => parse_json(?)))) source
       ON ${this.getMergeKeySQL(rows[0])}
       WHEN NOT MATCHED THEN INSERT (${this.getColumnList(rows[0])}) VALUES (${this.getColumnList(rows[0])})`,
          [JSON.stringify(rowValues)]
        );
        return;
      case RecordAction.Update:
        await this.db.query(
          `MERGE INTO "${this.tableName}" target
       USING (SELECT * FROM TABLE(FLATTEN(input => parse_json(?)))) source
       ON ${this.getMergeKeySQL(rows[0])}
       WHEN MATCHED THEN UPDATE SET ${this.getUpdateSetSQL(rows[0])}`,
          [JSON.stringify(rowValues)]
        );
        return;
      case RecordAction.Delete:
        await this.db.query(
          `DELETE FROM "${this.tableName}" WHERE (${this.getDeleteSQL(rows)})`,
          rows.flatMap(row => Object.values(row.keysValues))
        );
        return;
      default:
        throw new Error("Unknown record action: " + type);
    }
  }

  private getColumnList(row: ParsedRecord): string {
    return Object.keys(row.values).map(col => `"${col}"`).join(', ');
  }

  private getMergeKeySQL(row: ParsedRecord): string {
    const keys = Object.keys(row.keysValues);
    return keys.map(k => `target."${k}" = source."${k}"`).join(' AND ');
  }

  private getUpdateSetSQL(row: ParsedRecord): string {
    const columns = Object.keys(row.values);
    return columns.map(col => `"${col}" = source."${col}"`).join(', ');
  }

  private getDeleteSQL(rows: ParsedRecord[]): string {
    return rows.map(row => Object.keys(row.keysValues).map(k => `"${k}" = ?`).join(" AND ")).join(") OR (");
  }
} 