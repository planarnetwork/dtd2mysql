
import MySQLSchema from "./MySQLSchema";
import Record from "../../feed/record/Record";

export default class ConsoleSchema extends MySQLSchema {
    private logger;

    constructor(logger) {
        super(null);
        this.logger = logger;
    }

    createSchema(record: Record) {
        this.logger(super.getSchema(record) + ";");
    }

    dropSchema(record: Record) {
        this.logger(`DROP TABLE IF EXISTS ${record.name};`);
    }

}
