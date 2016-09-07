"use strict";
const MySQLRecord_1 = require("../storage/record/MySQLRecord");
const MySQLSchema_1 = require("../storage/schema/MySQLSchema");
const ConsoleRecord_1 = require("../storage/record/ConsoleRecord");
const ConsoleSchema_1 = require("../storage/schema/ConsoleSchema");
class Container {
    constructor() {
        this.constructors = {
            "database": () => {
                if (!process.env.DATEBASE_NAME) {
                    return this.get("database.console");
                }
                return require('promise-mysql').createPool({
                    host: process.env.DATABASE_HOSTNAME,
                    user: process.env.DATABASE_USERNAME,
                    password: process.env.DATABASE_PASSWORD,
                    database: process.env.DATABASE_NAME,
                    connectionLimit: 10,
                });
            },
            "database.console": () => {
                return {
                    /**
                     * Return a promise as for interop with promise-mysql
                     */
                    query: (query) => {
                        return new Promise((resolve) => {
                            console.log(query);
                            resolve();
                        });
                    },
                    end: () => { }
                };
            },
            "record.storage": () => {
                if (!process.env.DATEBASE_NAME) {
                    return new ConsoleRecord_1.default(console.log);
                }
                new MySQLRecord_1.default(this.get("database"));
            },
            "schema": () => {
                if (!process.env.DATEBASE_NAME) {
                    return new ConsoleSchema_1.default(console.log);
                }
                new MySQLSchema_1.default(this.get("database"));
            },
            "logger": () => {
                if (!process.env.DATEBASE_NAME) {
                    return () => { };
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Container;
