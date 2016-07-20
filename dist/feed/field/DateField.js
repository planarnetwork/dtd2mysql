"use strict";
const Text_1 = require('./Text');
class DateField extends Text_1.default {
    constructor(start) {
        super(start, 8);
    }
    getType() {
        return "DATE";
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DateField;
