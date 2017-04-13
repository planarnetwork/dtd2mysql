"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const record = new Record_1.default("railcard", ["railcard_code", "end_date"], immutable_1.Map({
    "railcard_code": new Text_1.default(0, 3, true),
    "end_date": new DateField_1.default(3),
    "start_date": new DateField_1.default(11),
    "quote_date": new DateField_1.default(19),
    "holder_type": new Text_1.default(27, 1),
    "description": new Text_1.default(28, 20),
    "restricted_by_issue": new Text_1.default(48, 1),
    "restricted_by_area": new Text_1.default(49, 1),
    "restricted_by_train": new Text_1.default(50, 1),
    "restricted_by_date": new Text_1.default(51, 1),
    "master_code": new Text_1.default(52, 3),
    "display_flag": new Text_1.default(55, 1),
    "max_passengers": new Int_1.default(56, 3),
    "min_passengers": new Int_1.default(59, 3),
    "max_holders": new Int_1.default(62, 3),
    "min_holders": new Int_1.default(65, 3),
    "max_acc_adults": new Int_1.default(68, 3),
    "min_acc_adults": new Int_1.default(71, 3),
    "max_adults": new Int_1.default(74, 3),
    "min_adults": new Int_1.default(77, 3),
    "max_children": new Int_1.default(80, 3),
    "min_children": new Int_1.default(83, 3),
    "price": new Int_1.default(86, 8),
    "discount_price": new Int_1.default(94, 8),
    "validity_period": new Text_1.default(102, 4),
    "last_valid_date": new DateField_1.default(106, true),
    "physical_card": new Text_1.default(114, 1),
    "capri_ticket_type": new Text_1.default(115, 3),
    "adult_status": new Text_1.default(118, 3),
    "child_status": new Text_1.default(121, 3),
    "aaa_status": new Text_1.default(124, 3)
}));
const RLC = new SingleRecordFile_1.default(record);
exports.default = RLC;
