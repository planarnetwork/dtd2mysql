"use strict";
class MySQLSchemaGenerator {
    getSchema(record) {
        const fields = record.fields.map(this.getField).join(',');
        const key = `PRIMARY KEY(${record.key.join(',')})`;
        const indexes = record.indexes.map(index => `KEY ${index} (${index})`);
        const table = [fields, key, ...indexes].join(',');
        return `CREATE TABLE IF NOT EXISTS ${record.name} (${table}) Engine=InnoDB;`;
    }
    getField(field, name) {
        return `${name} ${field.getType()} ` + field.isNullable() ? 'DEFAULT NULL' : 'NOT NULL';
    }
    dropSchema(record) {
        return `DROP TABLE IF EXISTS ${record.name}`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MySQLSchemaGenerator;
