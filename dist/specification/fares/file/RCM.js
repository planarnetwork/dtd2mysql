"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const record = new Record_1.default("railcard_minimum_fare", ["railcard_code", "ticket_code", "end_date"], immutable_1.Map({
    "railcard_code": new Text_1.default(0, 3),
    "ticket_code": new Text_1.default(3, 3),
    "end_date": new DateField_1.default(6),
    "start_date": new DateField_1.default(14),
    "minimum_fare": new Int_1.default(22, 8)
}));
const RCM = new SingleRecordFile_1.default(record);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RCM;
