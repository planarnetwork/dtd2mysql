
import MySQLRecord from "../storage/record/MySQLRecord";
import MySQLSchema from "../storage/schema/MySQLSchema";
export default class Container {

    private constructors = {
        "database": () => {
            return require('promise-mysql').createPool({
                host: process.env.DATABASE_HOSTNAME,
                user: process.env.DATABASE_USERNAME,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                connectionLimit: 10
            });
        },
        "record.storage": () => new MySQLRecord(this.get("database")),
        "schema": () => new MySQLSchema(this.get("database"))

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