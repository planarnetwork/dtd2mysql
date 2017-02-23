"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MySQLRecord_1 = require("../storage/record/MySQLRecord");
const MySQLSchema_1 = require("../storage/schema/MySQLSchema");
const ConsoleRecord_1 = require("../storage/record/ConsoleRecord");
const ConsoleSchema_1 = require("../storage/schema/ConsoleSchema");
const Bluebird = require("bluebird");
class Container {
    constructor() {
        this.constructors = {
            "database": () => {
                if (!process.env.DATABASE_NAME) {
                    return this.get("database.console");
                }
                return require('promise-mysql').createPool({
                    host: process.env.DATABASE_HOSTNAME,
                    user: process.env.DATABASE_USERNAME,
                    password: process.env.DATABASE_PASSWORD,
                    database: process.env.DATABASE_NAME,
                    connectionLimit: 10,
                    multipleStatements: true,
                });
            },
            "database.console": () => {
                return {
                    /**
                     * Return a promise as for interop with promise-mysql
                     */
                    query: (query) => {
                        return new Bluebird((resolve) => {
                            console.log(query + ";");
                            resolve();
                        });
                    },
                    end: () => { }
                };
            },
            "record.storage": () => {
                if (!process.env.DATABASE_NAME) {
                    return new ConsoleRecord_1.default(console.log);
                }
                return new MySQLRecord_1.default(this.get("database"));
            },
            "schema": () => {
                if (!process.env.DATABASE_NAME) {
                    return new ConsoleSchema_1.default(console.log);
                }
                return new MySQLSchema_1.default(this.get("database"));
            },
            "logger": () => {
                if (!process.env.DATABASE_NAME) {
                    return console.error;
                }
                return console.log;
            }
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
exports.default = Container;
