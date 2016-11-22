"use strict";
const Field_1 = require("./Field");
class DateField extends Field_1.default {
    constructor(start, nullable = false) {
        super(start, 8, nullable);
        this.nullChars = [" ", "*", "0"];
    }
    getType() {
        return "DATE";
    }
    getValue(row) {
        const value = super.extractValue(row);
        if (value === null) {
            return null;
        }
        return `${value.substr(4, 4)}-${value.substr(2, 2)}-${value.substr(0, 2)}`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DateField;
