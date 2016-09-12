"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const InitDB_1 = require("./InitDB");
const Container_1 = require("./Container");
const ImportFaresFeed_1 = require("./ImportFaresFeed");
const CleanFaresData_1 = require("./CleanFaresData");
const ImportTimetable_1 = require("./ImportTimetable");
const ConvertTimetable_1 = require("./ConvertTimetable");
class CLI {
    static getCommand(opt) {
        if (typeof this.commands[opt] !== 'function') {
            throw new Error("Unknown command: " + opt);
        }
        return new this.commands[opt](this.container);
    }
    static runCommand(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const [node, script, opt, ...argv] = args;
            try {
                yield this.getCommand(opt).run(argv);
            }
            catch (err) {
                console.error(err);
            }
            yield this.container.get("database").end();
        });
    }
}
CLI.commands = {
    "--init-db": InitDB_1.default,
    "--fares": ImportFaresFeed_1.default,
    "--fares-clean": CleanFaresData_1.default,
    "--timetable": ImportTimetable_1.default,
    "--convert-timetable": ConvertTimetable_1.default
};
CLI.container = new Container_1.default();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CLI;
