"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const ticketTypeRecord = new Record_1.default("ticket_type", ["ticket_code", "end_date"], immutable_1.Map({
    "ticket_code": new Text_1.default(1, 3),
    "end_date": new DateField_1.default(4),
    "start_date": new DateField_1.default(12),
    "quote_date": new DateField_1.default(20),
    "description": new Text_1.default(28, 15),
    "tkt_class": new Int_1.default(43, 1),
    "tkt_type": new Text_1.default(44, 1),
    "tkt_group": new Text_1.default(45, 1),
    "last_valid_day": new DateField_1.default(46),
    "max_passengers": new Int_1.default(54, 3),
    "min_passengers": new Int_1.default(57, 3),
    "max_adults": new Int_1.default(60, 3),
    "min_adults": new Int_1.default(63, 3),
    "max_children": new Int_1.default(66, 3),
    "min_children": new Int_1.default(69, 3),
    "restricted_by_date": new Text_1.default(72, 1),
    "restricted_by_train": new Text_1.default(73, 1),
    "restricted_by_area": new Text_1.default(74, 1),
    "validity_code": new Text_1.default(75, 2),
    "atb_description": new Text_1.default(77, 20),
    "lul_xlondon_issue": new Int_1.default(97, 1),
    "reservation_required": new Text_1.default(98, 1),
    "capri_code": new Text_1.default(99, 3),
    "lul_93": new Text_1.default(102, 1),
    "uts_code": new Text_1.default(103, 2),
    "time_restriction": new Int_1.default(105, 1),
    "free_pass_lul": new Text_1.default(106, 1),
    "package_mkr": new Text_1.default(107, 1),
    "fare_multiplier": new Int_1.default(108, 3),
    "discount_category": new Int_1.default(111, 2)
}));
const TTY = new SingleRecordFile_1.default(ticketTypeRecord);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TTY;
