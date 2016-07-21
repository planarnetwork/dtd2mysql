
import Record from "../../feed/record/Record";
import Schema from "./Schema";
import Field from "../../feed/field/Field";

export default class MySQLSchema implements Schema {
    private db;

    constructor(db) {
        this.db = db;
    }

    createSchema(record: Record) {
        const fields = record.fields.map(this.getField.bind(this)).join(',');
        const id = "id INT(11) unsigned auto_increment NOT NULL PRIMARY KEY";
        const unique = `UNIQUE ${record.name}_key (${record.key.join(',')})`;
        const indexes = record.indexes.map(index => `KEY ${index} (${index})`);
        const table = [id, fields, unique, ...indexes].join(',');
        const sql = `CREATE TABLE IF NOT EXISTS ${record.name} (${table}) Engine=InnoDB`;

        return this.db.query(sql);
    }

    private getField(field: Field, name: string) {
        return `${name} ${field.getType()} ${this.getNullStatement(field)}`;
    }

    private getNullStatement(field: Field) {
        return field.isNullable() ? 'DEFAULT NULL' : 'NOT NULL';
    }

    dropSchema(record: Record) {
        return this.db.query(`DROP TABLE IF EXISTS ${record.name}`);
    }
}