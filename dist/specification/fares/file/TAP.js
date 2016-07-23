"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const Time_1 = require("../../../feed/field/Time");
const record = new Record_1.default("advance_ticket", ["ticket_code", "restriction_code", "restriction_flag", "toc_id", "end_date"], immutable_1.Map({
    "ticket_code": new Text_1.default(0, 3),
    "restriction_code": new Text_1.default(3, 2),
    "restriction_flag": new Text_1.default(5, 1),
    "toc_id": new Text_1.default(6, 2),
    "end_date": new DateField_1.default(8),
    "start_date": new DateField_1.default(16),
    "check_type": new Text_1.default(24, 1),
    "ap_data": new Text_1.default(25, 8),
    "booking_time": new Time_1.default(33)
}));
const TAP = new SingleRecordFile_1.default(record);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TAP;
