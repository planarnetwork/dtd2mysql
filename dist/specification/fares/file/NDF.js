"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const ZeroFillInt_1 = require("../../../feed/field/ZeroFillInt");
const nonDerivableFareRecord = new Record_1.default("non_derivable_fare", ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "nd_record_type", "end_date"], immutable_1.Map({
    "origin_code": new Text_1.default(1, 4),
    "destination_code": new Text_1.default(5, 4),
    "route_code": new ZeroFillInt_1.default(9, 5, true),
    "railcard_code": new Text_1.default(14, 3),
    "ticket_code": new Text_1.default(17, 3),
    "nd_record_type": new Text_1.default(20, 1),
    "end_date": new DateField_1.default(21),
    "start_date": new DateField_1.default(29),
    "quote_date": new DateField_1.default(37),
    "suppress_mkr": new Text_1.default(45, 1),
    "adult_fare": new Int_1.default(46, 8, true),
    "child_fare": new Int_1.default(54, 8, true),
    "restriction_code": new Text_1.default(62, 2),
    "composite_indicator": new Text_1.default(64, 1),
    "cross_london_ind": new Text_1.default(65, 1),
    "ps_ind": new Text_1.default(66, 1)
}));
const NDF = new SingleRecordFile_1.default(nonDerivableFareRecord);
exports.default = NDF;
