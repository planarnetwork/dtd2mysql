"use strict";
class MultiRecordFile {
    constructor(recordTypes) {
        this.recordTypes = recordTypes;
    }
    getRecordTypes() {
        return this.recordTypes.toArray();
    }
    getRecord(line) {
        return this.recordTypes.get(line.charAt(1));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MultiRecordFile;
