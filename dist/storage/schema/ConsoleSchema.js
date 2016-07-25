"use strict";
const MySQLSchema_1 = require("./MySQLSchema");
class ConsoleSchema extends MySQLSchema_1.default {
    constructor(logger) {
        super(null);
        this.logger = logger;
    }
    createSchema(record) {
        this.logger(super.getSchema(record) + ";");
    }
    dropSchema(record) {
        this.logger(`DROP TABLE IF EXISTS ${record.name};`);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConsoleSchema;
