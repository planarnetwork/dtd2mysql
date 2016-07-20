
import RecordStorage from "./RecordStorage";

export default class MySQLRecord implements RecordStorage {
    private db;

    constructor(db) {
        this.db = db;
    }

    save(tableName: string, data: Object) {
        return this.db.query(`INSERT INTO ${tableName} SET ?`, data);
    }

    truncate(tableName: string) {
        return this.db.query(`TRUNCATE ${tableName}`);
    }

}