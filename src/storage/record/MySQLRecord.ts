
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

    async flush(tableName: string) {
        const values = this.inserts[tableName];
        this.inserts[tableName] = [];

        try {
            await this.db.query(`INSERT INTO ${tableName} VALUES ?`, [values]);
        }
        catch (err) {
            console.log(`Error flushing ${tableName} with values ${values[0].join("\n")}`);
            console.log(err.stack);
            process.abort();
        }
    }

    flushAll() {
        return Object.keys(this.inserts).map(t => this.flush(t));
    }

}