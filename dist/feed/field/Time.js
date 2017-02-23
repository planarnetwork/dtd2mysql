"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Field_1 = require("./Field");
class Time extends Field_1.default {
    constructor(start, nullable = false) {
        super(start, 4, nullable);
    }
    getType() {
        return "TIME";
    }
    getValue(row) {
        const value = super.extractValue(row);
        if (value === null) {
            return null;
        }
        return `${value.substr(0, 2)}:${value.substr(2, 2)}`;
    }
}
exports.default = Time;
