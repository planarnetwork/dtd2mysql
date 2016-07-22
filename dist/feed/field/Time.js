"use strict";
const Text_1 = require('./Text');
class Time extends Text_1.default {
    constructor(start, nullable = false) {
        super(start, 4, nullable);
    }
    getType() {
        return "TIME";
    }
    getValue(row) {
        const value = super.getValue(row);
        if (value === null) {
            return null;
        }
        return `${value.substr(0, 2)}:${value.substr(2, 2)}`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Time;
