"use strict";
class MySQLSchema {
    constructor(db) {
        this.db = db;
    }
    createSchema(record) {
        const fields = record.fields.map(this.getField.bind(this)).join(',');
        const key = `PRIMARY KEY(${record.key.join(',')})`;
        const indexes = record.indexes.map(index => `KEY ${index} (${index})`);
        const table = [fields, key, ...indexes].join(',');
        return this.db.query(`CREATE TABLE IF NOT EXISTS ${record.name} (${table}) Engine=InnoDB`);
    }
    getField(field, name) {
        return `${name} ${field.getType()} ${this.getNullStatement(field)}`;
    }
    getNullStatement(field) {
        return field.isNullable() ? 'DEFAULT NULL' : 'NOT NULL';
    }
    dropSchema(record) {
        return this.db.query(`DROP TABLE IF EXISTS ${record.name}`);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MySQLSchema;
