"use strict";
class Text {
    constructor(position, length, isNullable = false) {
        this.nullChars = [" ", "*"];
        this.position = position;
        this.length = length;
        this.nullable = isNullable;
    }
    getValue(row) {
        const value = row.substr(this.position, this.length);
        if (this.isNullable() && this.getNullValues().indexOf(value) !== -1) {
            return null;
        }
        else {
            return value;
        }
    }
    getNullValues() {
        return this.nullChars.map(c => Array(this.length + 1).join(c));
    }
    getType() {
        return "CHAR(" + this.length + ")";
    }
    isNullable() {
        return this.nullable;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Text;
