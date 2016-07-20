"use strict";
const MySQLRecord_1 = require("../storage/record/MySQLRecord");
const MySQLSchema_1 = require("../storage/schema/MySQLSchema");
class Container {
    constructor() {
        this.constructors = {
            "database": () => {
                return require('promise-mysql').createPool({
                    host: process.env.DATABASE_HOSTNAME,
                    user: process.env.DATABASE_USERNAME,
                    password: process.env.DATABASE_PASSWORD,
                    database: process.env.DATABASE_NAME,
                    connectionLimit: 10
                });
            },
            "record.storage": () => new MySQLRecord_1.default(this.get("database")),
            "schema": () => new MySQLSchema_1.default(this.get("database"))
        };
        this.cache = {};
    }
    get(name) {
        if (!this.constructors[name]) {
            throw new Error("Unknown dependency: " + name);
        }
        if (!this.cache[name]) {
            this.cache[name] = this.constructors[name]();
        }
        return this.cache[name];
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Container;
