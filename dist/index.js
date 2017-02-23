#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CLI_1 = require("./command/CLI");
try {
    CLI_1.default.runCommand(process.argv);
}
catch (err) {
    console.error(err);
}
