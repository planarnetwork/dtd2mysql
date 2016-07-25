
import MySQLRecord from "../storage/record/MySQLRecord";
import MySQLSchema from "../storage/schema/MySQLSchema";
import ConsoleRecord from "../storage/record/ConsoleRecord";
import ConsoleSchema from "../storage/schema/ConsoleSchema";

export default class Container {

    private constructors = {
        "database": () => {
            return require('promise-mysql').createPool({
                host: process.env.DATABASE_HOSTNAME,
                user: process.env.DATABASE_USERNAME,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                connectionLimit: 10,
//                debug: ['ComQueryPacket', 'RowDataPacket']
            });
        },
        "record.storage": () => {
            if (!process.env.DATEBASE_NAME) {
                return new ConsoleRecord(console.log);
            }
            new MySQLRecord(this.get("database"));
        },
        "schema": () => {
            if (!process.env.DATEBASE_NAME) {
                return new ConsoleSchema(console.log);
            }
            new MySQLSchema(this.get("database"));
        },
        "logger": () => {
            if (!process.env.DATEBASE_NAME) {
                return () => {};
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