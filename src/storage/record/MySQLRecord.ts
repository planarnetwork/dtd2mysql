
import RecordStorage from "./RecordStorage";

const FLUSH_LIMIT = 10000;

export default class MySQLRecord implements RecordStorage {
    private db;
    private inserts = {};

    constructor(db) {
        this.db = db;
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
        return this.db.query(`TRUNCATE ${tableName}`);
    }

    flush(tableName: string) {
        const promise = this.db.query(`INSERT INTO ${tableName} VALUES ?`, [this.inserts[tableName]]);

        this.inserts[tableName] = [];

        return promise;
    }

    flushAll() {
        return Object.keys(this.inserts).map(t => this.flush(t));
    }

}