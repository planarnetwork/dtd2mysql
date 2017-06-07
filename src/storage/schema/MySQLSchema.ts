
import Record from "../../feed/record/Record";
import Schema from "./Schema";
import Field from "../../feed/field/Field";

export default class MySQLSchema implements Schema {
    private db;

    constructor(db) {
        this.db = db;
    }

    createSchema(record: Record) {
        return this.db.query(this.getSchema(record));
    }

    protected getSchema(record: Record) {
        const id = "id INT(11) unsigned auto_increment NOT NULL PRIMARY KEY";
        const fields = "," + record.fields.map(this.getField.bind(this)).join(',');
        const unique = record.key.length === 0 ? "" : `, UNIQUE ${record.name}_key (${record.key.join(',')})`;
        const indexes = record.indexes.map(index => `, KEY ${index} (${index})`);
        const table = [id, fields, unique, ...indexes].join('');

        return `CREATE TABLE IF NOT EXISTS ${record.name} (${table}) Engine=InnoDB`;
    }

    protected getField(field: Field, name: string) {
        return `${name} ${field.getType()} ${this.getNullStatement(field)}`;
    }

    protected getNullStatement(field: Field) {
        return field.isNullable() ? 'DEFAULT NULL' : 'NOT NULL';
    }

    dropSchema(record: Record) {
        return this.db.query(`DROP TABLE IF EXISTS ${record.name}`);
    }
}