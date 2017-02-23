"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MultiRecordFile {
    constructor(recordTypes, typeStart = 1, typeLength = 1) {
        this.recordTypes = recordTypes;
        this.typeStart = typeStart;
        this.typeLength = typeLength;
    }
    getRecordTypes() {
        return this.recordTypes.toArray();
    }
    getRecord(line) {
        return this.recordTypes.get(line.substr(this.typeStart, this.typeLength));
    }
}
exports.default = MultiRecordFile;
