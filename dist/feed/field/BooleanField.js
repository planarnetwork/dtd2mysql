"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Field_1 = require("./Field");
class BooleanField extends Field_1.default {
    constructor(start, nullable = false) {
        super(start, 1, nullable);
        this.truthyChars = ["Y", "1"];
        this.falseChars = ["N", "0"];
    }
    getType() {
        return "TINYINT(1)";
    }
    getValue(row) {
        const value = super.extractValue(row);
        if (value === null) {
            return null;
        }
        if (this.truthyChars.indexOf(value) >= 0) {
            return 1;
        }
        else if (this.falseChars.indexOf(value) >= 0) {
            return 0;
        }
        else {
            throw new Error(`Unable to interpret ${value} as boolean`);
        }
    }
}
exports.default = BooleanField;
