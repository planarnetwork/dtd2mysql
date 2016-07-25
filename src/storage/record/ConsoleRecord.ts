
import RecordStorage from "./RecordStorage";

const FLUSH_LIMIT = 1000;
const mysql = require('promise-mysql');

export default class ConsoleRecord implements RecordStorage {
    private logger: (string) => any;
    private inserts = {};

    constructor(logger) {
        this.logger = logger;
    }

    save(tableName: string, data: Object) {
        if (!this.inserts[tableName]) {
            this.inserts[tableName] = [];
        }

        this.inserts[tableName].push(data);

        if (this.inserts[tableName].length >= FLUSH_LIMIT) {
            return this.flush(tableName);
        }
    }

    truncate(tableName: string) {
        this.logger(`TRUNCATE ${tableName};`);
    }

    flush(tableName: string) {
        const inserts = this.inserts[tableName].map(this.flatten).join(",");

        this.logger(`INSERT INTO ${tableName} VALUES ${inserts};`);
        this.inserts[tableName] = [];
    }

    private flatten(row: any[]) {
        return "(" + row.map(mysql.escape).join(",") + ")";
    }

    flushAll() {
        return Object.keys(this.inserts).map(t => this.flush(t));
    }

}