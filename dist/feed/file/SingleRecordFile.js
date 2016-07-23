"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SingleRecordFile;
