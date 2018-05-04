

import {DatabaseConnection} from "./DatabaseConnection";
import {Field} from "../feed/field/Field";
import {Record} from "../feed/record/Record";
import {TextField, VariableLengthText} from "../feed/field/TextField";
import {IntField, ZeroFillIntField} from "../feed/field/IntField";
import {BooleanField} from "../feed/field/BooleanField";
import {DateField, NullDateField, ShortDateField} from "../feed/field/DateField";
import {TimeField} from "../feed/field/TimeField";
import {DoubleField} from "../feed/field/DoubleField";
import {ForeignKeyField} from "../feed/field/ForeignKeyField";

export class MySQLSchema {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly record: Record
  ) {}

  /**
   * Create the schema for the given record
   */
  public createSchema(): Promise<any> {
    return this.db.query(this.getSchema());
  }

  /**
   * Drop the table
   */
  public dropSchema(): Promise<any> {
    return this.db.query(`DROP TABLE IF EXISTS \`${this.record.name}\``);
  }

  private getSchema(): string {
    const id = "id INT(11) unsigned auto_increment NOT NULL PRIMARY KEY";
    const fields = "," + Object.entries(this.record.fields).map(MySQLSchema.getField).join(',');
    const unique = this.record.key.length === 0 ? "" : `, UNIQUE ${this.record.name}_key (${this.record.key.join(',')})`;
    const indexes = this.record.indexes.map(index => `, KEY ${index} (${index})`);
    const table = [id, fields, unique, ...indexes].join('');

    return `CREATE TABLE IF NOT EXISTS \`${this.record.name}\` (${table}) Engine=InnoDB`;
  }

  private static getField(entry: [string, Field]): string {
    const [name, field] = entry;
    const type = MySQLSchema.getFieldType(field);
    const nullable = MySQLSchema.getNullStatement(field);

    return `\`${name}\` ${type} ${nullable}`;
  }

  private static getFieldType(field: Field): string {
    if (field instanceof VariableLengthText) return `VARCHAR(${field.length})`;
    if (field instanceof TextField)          return `CHAR(${field.length})`;
    if (field instanceof BooleanField)       return `TINYINT(1) unsigned`;
    if (field instanceof ShortDateField)     return `DATE`;
    if (field instanceof DateField)          return `DATE`;
    if (field instanceof NullDateField)      return `DATE`;
    if (field instanceof TimeField)          return `TIME`;
    if (field instanceof DoubleField)        return `DOUBLE(${field.length}, ${field.decimalDigits}) unsigned`;
    if (field instanceof ZeroFillIntField)   return `CHAR(${field.length})`;
    if (field instanceof IntField)           return `${MySQLSchema.getIntType(field.length)} unsigned`;
    if (field instanceof ForeignKeyField)    return `INT(11) unsigned`;

    throw new Error("Unknown field type");
  }

  private static getIntType(length: number): string {
    if (length > 9) return `BIGINT(${length})`;
    if (length > 7) return `INT(${length})`;
    if (length > 4) return `MEDIUMINT(${length})`;
    if (length > 2) return `SMALLINT(${length})`;
    return `TINYINT(${length})`;
  }

  private static getNullStatement(field: Field): string {
    return field.nullable ? 'DEFAULT NULL' : 'NOT NULL';
  }

}
