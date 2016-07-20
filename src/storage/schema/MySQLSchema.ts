
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
        const key = `PRIMARY KEY(${record.key.join(',')})`;
        const indexes = record.indexes.map(index => `KEY ${index} (${index})`);
        const table = [fields, key, ...indexes].join(',');

        return this.db.query(`CREATE TABLE IF NOT EXISTS ${record.name} (${table}) Engine=InnoDB`);
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