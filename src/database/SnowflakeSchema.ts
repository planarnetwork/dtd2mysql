import { DatabaseConnection } from "./DatabaseConnection";
import { Field } from "../feed/field/Field";
import { Record } from "../feed/record/Record";
import { TextField, VariableLengthText } from "../feed/field/TextField";
import { IntField, ZeroFillIntField } from "../feed/field/IntField";
import { BooleanField } from "../feed/field/BooleanField";
import { DateField, NullDateField, ShortDateField } from "../feed/field/DateField";
import { TimeField } from "../feed/field/TimeField";
import { DoubleField } from "../feed/field/DoubleField";
import { ForeignKeyField } from "../feed/field/ForeignKeyField";

export class SnowflakeSchema {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly record: Record
  ) {}

  public createSchema(): Promise<any> {
    return this.db.query(this.getSchema());
  }

  public dropSchema(): Promise<any> {
    return this.db.query(`DROP TABLE IF EXISTS "${this.record.name}"`);
  }

  private getSchema(): string {
    const id = "id NUMBER AUTOINCREMENT PRIMARY KEY";
    const fields = ", " + Object.entries(this.record.fields).map(SnowflakeSchema.getField).join(', ');
    const unique = this.record.key.length === 0 ? "" : `, UNIQUE ${this.record.name}_key (${this.record.key.join(',')})`;
    const indexes = this.record.indexes.map(index => `, INDEX ${index} (${index})`);
    const table = [id, fields, unique, ...indexes].join('');

    return `CREATE TABLE IF NOT EXISTS "${this.record.name}" (${table})`;
  }

  private static getField(entry: [string, Field]): string {
    const [name, field] = entry;
    const type = SnowflakeSchema.getFieldType(field);
    const nullable = SnowflakeSchema.getNullStatement(field);

    return `"${name}" ${type} ${nullable}`;
  }

  private static getFieldType(field: Field): string {
    if (field instanceof VariableLengthText) return `VARCHAR(${field.length})`;
    if (field instanceof TextField)          return `CHAR(${field.length})`;
    if (field instanceof BooleanField)       return `BOOLEAN`;
    if (field instanceof ShortDateField)     return `DATE`;
    if (field instanceof DateField)          return `DATE`;
    if (field instanceof NullDateField)      return `DATE`;
    if (field instanceof TimeField)          return `TIME`;
    if (field instanceof DoubleField)        return `FLOAT`;
    if (field instanceof ZeroFillIntField)   return `VARCHAR(${field.length})`;
    if (field instanceof IntField)           return `${SnowflakeSchema.getIntType(field.length)}`;
    if (field instanceof ForeignKeyField)    return `NUMBER`;

    throw new Error("Unknown field type");
  }

  private static getIntType(length: number): string {
    if (length >= 11) return `BIGINT`;
    return `INTEGER`;
  }

  private static getNullStatement(field: Field): string {
    return field.nullable ? 'NULL' : 'NOT NULL';
  }
} 