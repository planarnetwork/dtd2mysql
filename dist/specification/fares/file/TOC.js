"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const toc = new Record_1.default("toc", ["toc_id"], immutable_1.Map({
    "toc_id": new Text_1.default(1, 2),
    "toc_name": new Text_1.default(3, 30),
    "active": new Text_1.default(41, 1)
}));
const fare = new Record_1.default("toc_fare", ["fare_toc_id", "toc_id"], immutable_1.Map({
    "fare_toc_id": new Text_1.default(1, 3),
    "toc_id": new Text_1.default(4, 2),
    "fare_toc_name": new Text_1.default(6, 30)
}));
const TOC = new MultiRecordFile_1.default(immutable_1.Map({
    "T": toc,
    "F": fare
}), 0);
exports.default = TOC;
