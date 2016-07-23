"use strict";
const Text_1 = require('./Text');
class DateField extends Text_1.default {
    constructor(start, nullable = false) {
        super(start, 8, nullable);
        this.nullChars = [" ", "*", "0"];
    }
    getType() {
        return "DATE";
    }
    getValue(row) {
        const value = super.getValue(row);
        if (value === null) {
            return null;
        }
        return `${value.substr(4, 4)}-${value.substr(2, 2)}-${value.substr(0, 2)}`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DateField;
