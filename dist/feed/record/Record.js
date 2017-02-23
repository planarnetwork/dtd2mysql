///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = Record;
