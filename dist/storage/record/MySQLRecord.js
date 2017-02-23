"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FLUSH_LIMIT = 10000;
class MySQLRecord {
    constructor(db) {
        this.inserts = {};
        this.db = db;
    }
    save(tableName, data) {
        if (!this.inserts[tableName]) {
            this.inserts[tableName] = [];
        }
        this.inserts[tableName].push(data);
        if (this.inserts[tableName].length >= FLUSH_LIMIT) {
            return this.flush(tableName);
        }
    }
    truncate(tableName) {
        return this.db.query(`TRUNCATE ${tableName}`);
    }
    flush(tableName) {
        const promise = this.db.query(`INSERT INTO ${tableName} VALUES ?`, [this.inserts[tableName]]);
        this.inserts[tableName] = [];
        return promise;
    }
    flushAll() {
        return Object.keys(this.inserts).map(t => this.flush(t));
    }
}
exports.default = MySQLRecord;
