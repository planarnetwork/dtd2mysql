"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const pkg = new Record_1.default("package", ["package_code", "end_date"], immutable_1.Map({
    "package_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "start_date": new DateField_1.default(12),
    "quote_date": new DateField_1.default(20),
    "restriction_code": new Text_1.default(28, 2),
    "origin_facilities": new Text_1.default(30, 26),
    "destination_facilities": new Text_1.default(56, 26)
}));
const supplement = new Record_1.default("package_supplement", ["package_code", "end_date", "supplement_code"], immutable_1.Map({
    "package_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "supplement_code": new Text_1.default(12, 3),
    "direction": new Text_1.default(15, 1),
    "pack_number": new Text_1.default(16, 3),
    "origin_facility": new Text_1.default(19, 1, true),
    "dest_facility": new Text_1.default(20, 1, true)
}));
const TPK = new MultiRecordFile_1.default(immutable_1.Map({
    "P": pkg,
    "S": supplement
}), 0);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TPK;
