"use strict";
class MySQLSchema {
    constructor(db) {
        this.db = db;
    }
    createSchema(record) {
        const fields = record.fields.map(this.getField.bind(this)).join(',');
        const id = "id INT(11) unsigned auto_increment NOT NULL PRIMARY KEY";
        const unique = `UNIQUE ${record.name}_key (${record.key.join(',')})`;
        const indexes = record.indexes.map(index => `KEY ${index} (${index})`);
        const table = [id, fields, unique, ...indexes].join(',');
        const sql = `CREATE TABLE IF NOT EXISTS ${record.name} (${table}) Engine=InnoDB`;
        return this.db.query(sql);
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
