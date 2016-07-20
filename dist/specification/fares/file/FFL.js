"use strict";
const immutable_1 = require('immutable');
const Record_1 = require("../../../feed/record/Record");
const ZeroFillInt_1 = require("../../../feed/field/ZeroFillInt");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const flowRecord = new Record_1.default("flow", ["origin_code", "destination_code", "route_code", "status_code", "usage_code", "direction", "end_date"], immutable_1.Map({
    "origin_code": new Text_1.default(2, 4),
    "destination_code": new Text_1.default(6, 4),
    "route_code": new ZeroFillInt_1.default(10, 5),
    "status_code": new ZeroFillInt_1.default(15, 3),
    "usage_code": new Text_1.default(18, 1),
    "direction": new Text_1.default(19, 1),
    "end_date": new DateField_1.default(20),
    "start_date": new DateField_1.default(28),
    "toc": new Text_1.default(36, 3),
    "cross_london_ind": new Int_1.default(39, 1),
    "ns_disc_ind": new Int_1.default(40, 1),
    "publication_ind": new Text_1.default(41, 1),
    "flow_id": new Int_1.default(42, 7),
}));
const fareRecord = new Record_1.default("fare", ["flow_id", "ticket_code"], immutable_1.Map({
    "flow_id": new Int_1.default(2, 7),
    "ticket_code": new Text_1.default(9, 3),
    "fare": new Int_1.default(12, 8),
    "restriction_code": new Text_1.default(20, 2)
}));
const FFL = new MultiRecordFile_1.default(immutable_1.Map({
    "F": flowRecord,
    "T": fareRecord
}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FFL;
