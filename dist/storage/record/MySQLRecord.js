"use strict";
class MySQLRecord {
    constructor(db) {
        this.db = db;
    }
    save(tableName, data) {
        return this.db.query(`INSERT INTO ${tableName} SET ?`, data);
    }
    truncate(tableName) {
        return this.db.query(`TRUNCATE ${tableName}`);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MySQLRecord;
