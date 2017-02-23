"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SingleRecordFile {
    constructor(recordTypes) {
        this.recordType = recordTypes;
    }
    getRecordTypes() {
        return [this.recordType];
    }
    getRecord(line) {
        return this.recordType;
    }
}
exports.default = SingleRecordFile;
