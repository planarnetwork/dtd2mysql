
import MySQLRecord from "../storage/record/MySQLRecord";
import MySQLSchema from "../storage/schema/MySQLSchema";
import ConsoleRecord from "../storage/record/ConsoleRecord";
import ConsoleSchema from "../storage/schema/ConsoleSchema";
import * as Bluebird from "bluebird";
import RecordStorage from "../storage/record/RecordStorage";

export default class Container {

    private constructors = {
        "database": () => {
            if (!process.env.DATABASE_NAME) {
                return this.get("database.console");
            }

            return require('promise-mysql').createPool({
                host: process.env.DATABASE_HOSTNAME,
                user: process.env.DATABASE_USERNAME,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                connectionLimit: 2,
                multipleStatements: true,
                //debug: ['ComQueryPacket', 'RowDataPacket']
            });
        },
        "database.console": () => {
            return {
                /**
                 * Return a promise as for interop with promise-mysql
                 */
                query: (query: string): Bluebird<any> => {
                    return new Bluebird((resolve) => {
                        console.log(query+";");
                        resolve();
                    });
                },
                end: () => {}
            }
        },
        "record.storage": (): RecordStorage => {
            if (!process.env.DATABASE_NAME) {
                return new ConsoleRecord(console.log);
            }
            return new MySQLRecord(this.get("database"));
        },
        "schema": () => {
            if (!process.env.DATABASE_NAME) {
                return new ConsoleSchema(console.log);
            }
            return new MySQLSchema(this.get("database"));
        },
        "logger": () => {
            if (!process.env.DATABASE_NAME) {
                return console.error;
            }
            return console.log;
        }

    };

    private cache = {};

    get(name: string) {
        if (!this.constructors[name]) {
            throw new Error("Unknown dependency: " + name);
        }
        if (!this.cache[name]) {
            this.cache[name] = this.constructors[name]();
        }
        return this.cache[name];
    }

}