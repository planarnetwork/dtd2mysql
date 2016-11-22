"use strict";
const Field_1 = require("./Field");
class Int extends Field_1.default {
    constructor() {
        super(...arguments);
        this.nullChars = [" ", "*", "9"];
    }
    getValue(row) {
        const value = super.extractValue(row);
        if (value === null) {
            return null;
        }
        const intValue = parseInt(value);
        if (isNaN(intValue)) {
            throw new Error(`Error parsing int: "${value}" at position ${this.position}`);
        }
        return intValue;
    }
    getType() {
        return this.getIntType() + "(" + this.length + ") unsigned";
    }
    getIntType() {
        if (this.length > 9) {
            return "BIGINT";
        }
        else if (this.length > 7) {
            return "INT";
        }
        else if (this.length > 4) {
            return "MEDIUMINT";
        }
        else if (this.length > 2) {
            return "SMALLINT";
        }
        else {
            return "TINYINT";
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Int;
