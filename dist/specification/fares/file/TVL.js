"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const ticketValidity = new Record_1.default("ticket_validity", ["validity_code", "end_date"], immutable_1.Map({
    "validity_code": new Text_1.default(0, 2),
    "end_date": new DateField_1.default(2),
    "start_date": new DateField_1.default(10),
    "description": new Text_1.default(18, 20),
    "out_days": new Int_1.default(38, 2),
    "out_months": new Int_1.default(40, 2),
    "ret_days": new Int_1.default(42, 2),
    "ret_months": new Int_1.default(44, 2),
    "ret_after_days": new Int_1.default(46, 2),
    "ret_after_months": new Int_1.default(48, 2),
    "ret_after_day": new Text_1.default(50, 2, true),
    "break_out": new Text_1.default(52, 1),
    "break_in": new Text_1.default(53, 1),
    "out_description": new Text_1.default(54, 14),
    "rtn_description": new Text_1.default(68, 14)
}));
const TVL = new SingleRecordFile_1.default(ticketValidity);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TVL;
