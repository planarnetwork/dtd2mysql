"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const statusDiscount = new Record_1.default("status_discount", ["status_code", "end_date", "discount_category"], immutable_1.Map({
    "status_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "discount_category": new Int_1.default(12, 2),
    "discount_indicator": new Text_1.default(14, 1),
    "discount_percentage": new Int_1.default(15, 3)
}));
const status = new Record_1.default("status", ["status_code", "end_date"], immutable_1.Map({
    "status_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "start_date": new DateField_1.default(12),
    "atb_desc": new Text_1.default(20, 5),
    "cc_desc": new Text_1.default(25, 5),
    "uts_code": new Text_1.default(30, 1),
    "first_single_max_flat": new Int_1.default(31, 8),
    "first_return_max_flat": new Int_1.default(39, 8),
    "std_single_max_flat": new Int_1.default(47, 8),
    "std_return_max_flat": new Int_1.default(55, 8),
    "first_lower_min": new Int_1.default(63, 8),
    "first_higher_min": new Int_1.default(71, 8),
    "std_lower_min": new Int_1.default(79, 8),
    "std_higher_min": new Int_1.default(87, 8),
    "fs_mkr": new Text_1.default(95, 1),
    "fr_mkr": new Text_1.default(96, 1),
    "ss_mkr": new Text_1.default(97, 1),
    "sr_mkr": new Text_1.default(98, 1)
}));
const DIS = new MultiRecordFile_1.default(immutable_1.Map({
    "S": status,
    "D": statusDiscount
}), 0);
exports.default = DIS;
