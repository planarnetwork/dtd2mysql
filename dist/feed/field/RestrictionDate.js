"use strict";
const Text_1 = require('./Text');
const moment = require("moment");
class RestrictionDate extends Text_1.default {
    constructor(start, referenceDateName, comparer, nullable = false) {
        super(start, 8, nullable);
        this.nullChars = [" ", "*", "0"];
        this.referenceDateName = referenceDateName;
        this.comparer = comparer;
    }
    getType() {
        return "DATE";
    }
    getValue(row, globalContext) {
        const value = super.getValue(row, globalContext);
        if (value === null) {
            return null;
        }
        if (!globalContext[this.referenceDateName]) {
            throw new Error(this.referenceDateName + " not set in global context");
        }
        const referenceDate = globalContext[this.referenceDateName];
        const date = `${referenceDate.substr(0, 4)}-${value.substr(0, 2)}-${value.substr(2, 2)}`;
        return this.comparer(moment(referenceDate), moment(date)).format("YYYY-MM-DD");
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RestrictionDate;
