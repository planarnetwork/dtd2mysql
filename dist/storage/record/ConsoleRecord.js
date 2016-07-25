"use strict";
const FLUSH_LIMIT = 1000;
const mysql = require('promise-mysql');
class ConsoleRecord {
    constructor(logger) {
        this.inserts = {};
        this.logger = logger;
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
        this.logger(`TRUNCATE ${tableName};`);
    }
    flush(tableName) {
        const inserts = this.inserts[tableName].map(this.flatten).join(",");
        this.logger(`INSERT INTO ${tableName} VALUES ${inserts};`);
        this.inserts[tableName] = [];
    }
    flatten(row) {
        return "(" + row.map(mysql.escape).join(",") + ")";
    }
    flushAll() {
        return Object.keys(this.inserts).map(t => this.flush(t));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConsoleRecord;
