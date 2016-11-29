"use strict";
const InitDB_1 = require("./InitDB");
const Container_1 = require("./Container");
const ImportFaresFeed_1 = require("./ImportFaresFeed");
const CleanFaresData_1 = require("./CleanFaresData");
const ImportTimetable_1 = require("./ImportTimetable");
const CleanTimetableData_1 = require("./CleanTimetableData");
class CLI {
    static getCommand(opt) {
        if (typeof this.commands[opt] !== 'function') {
            throw new Error("Unknown command: " + opt);
        }
        return new this.commands[opt](this.container);
    }
    static runCommand(args) {
        const [node, script, opt, ...argv] = args;
        this.getCommand(opt).run(argv)
            .then(_ => this.container.get("database").end())
            .catch(err => {
            console.error(err);
            this.container.get("database").end();
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CLI;
CLI.commands = {
    "--init-db": InitDB_1.default,
    "--fares": ImportFaresFeed_1.default,
    "--fares-clean": CleanFaresData_1.default,
    "--timetable": ImportTimetable_1.default,
    "--timetable-clean": CleanTimetableData_1.default
};
CLI.container = new Container_1.default();
