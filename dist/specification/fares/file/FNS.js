"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const ZeroFillInt_1 = require("../../../feed/field/ZeroFillInt");
const discountRecord = new Record_1.default("non_standard_discount", ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "end_date"], immutable_1.Map({
    "origin_code": new Text_1.default(1, 4, true),
    "destination_code": new Text_1.default(5, 4, true),
    "route_code": new ZeroFillInt_1.default(9, 5, true),
    "railcard_code": new Text_1.default(14, 3, true),
    "ticket_code": new Text_1.default(17, 3),
    "end_date": new DateField_1.default(20),
    "start_date": new DateField_1.default(28),
    "quote_date": new DateField_1.default(36),
    "use_nlc": new Text_1.default(44, 4),
    "adult_nodis_flag": new Text_1.default(48, 1),
    "adult_add_on_amount": new Int_1.default(49, 8, true),
    "adult_rebook_flag": new Text_1.default(57, 1),
    "child_nodis_flag": new Text_1.default(58, 1),
    "child_add_on_amount": new Int_1.default(59, 8, true),
    "child_rebook_flag": new Text_1.default(67, 1)
}));
const FNS = new SingleRecordFile_1.default(discountRecord);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FNS;
