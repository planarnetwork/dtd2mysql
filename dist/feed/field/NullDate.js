"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Field_1 = require("./Field");
class NullDate extends Field_1.default {
    constructor() {
        super(0, 0, true);
    }
    getValue(row) {
        return null;
    }
    getType() {
        return "DATE";
    }
}
exports.default = NullDate;
