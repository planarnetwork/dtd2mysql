"use strict";
const Text_1 = require("./Text");
class Int extends Text_1.default {
    getValue(row) {
        const value = super.getValue(row);
        if (value === null) {
            return null;
        }
        const intValue = parseInt(value);
        if (isNaN(intValue)) {
            throw new Error(`Error parsing int: "${value}" at position ${this.position}`);
        }
        return value;
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
