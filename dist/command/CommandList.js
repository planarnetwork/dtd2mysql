"use strict";
const InitDB_1 = require("./InitDB");
class CommandList {
    static getCommand(opt) {
        if (typeof this.commands[opt] !== 'function') {
            throw new Error("Unknown command: " + opt);
        }
        return new this.commands[opt];
    }
}
CommandList.commands = {
    "--init-db": InitDB_1.default
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandList;
