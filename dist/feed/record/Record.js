///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>
"use strict";
class Record {
    constructor(name, key, fields, indexes = []) {
        this.name = name;
        this.key = key;
        this.indexes = indexes;
        this.fields = fields;
    }
    extractRecord(line) {
        return [null].concat(this.fields.toArray().map(f => f.getValue(line)));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Record;
