"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const rover = new Record_1.default("rover", ["rover_code", "end_date"], immutable_1.Map({
    "rover_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "start_date": new DateField_1.default(12),
    "quote_date": new DateField_1.default(20),
    "description": new Text_1.default(28, 30),
    "ticket_desc": new Text_1.default(58, 15),
    "capri_ticket_code": new Text_1.default(73, 3),
    "rover_accounting_code": new Text_1.default(76, 4),
    "days_travel": new Int_1.default(80, 3),
    "months_valid": new Int_1.default(83, 2),
    "days_valid": new Int_1.default(85, 2)
}));
const price = new Record_1.default("rover_price", ["rover_code", "end_date", "railcard_code", "rover_class"], immutable_1.Map({
    "rover_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "railcard_code": new Text_1.default(12, 3),
    "rover_class": new Int_1.default(15, 1),
    "adult_fare": new Int_1.default(16, 8),
    "child_fare": new Int_1.default(24, 8),
    "restriction_code": new Text_1.default(32, 2, true)
}));
const TRR = new MultiRecordFile_1.default(immutable_1.Map({
    "R": rover,
    "P": price
}), 0);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TRR;
