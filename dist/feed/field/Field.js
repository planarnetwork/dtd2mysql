"use strict";
class Field {
    constructor(position, length, isNullable = false) {
        this.nullChars = [" ", "*"];
        this.position = position;
        this.length = length;
        this.nullable = isNullable;
    }
    isNullable() {
        return this.nullable;
    }
    getNullValues() {
        return this.nullChars.map(c => Array(this.length + 1).join(c));
    }
    extractValue(row) {
        const value = row.substr(this.position, this.length);
        if (this.isNullable() && this.getNullValues().indexOf(value) !== -1) {
            return null;
        }
        else {
            return value;
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Field;
