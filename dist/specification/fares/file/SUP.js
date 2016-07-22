"use strict";
const immutable_1 = require('immutable');
const Record_1 = require("../../../feed/record/Record");
const ZeroFillInt_1 = require("../../../feed/field/ZeroFillInt");
const DateField_1 = require("../../../feed/field/DateField");
const Int_1 = require("../../../feed/field/Int");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const supplementRecord = new Record_1.default("supplement", ["supplement_code", "end_date"], immutable_1.Map({
    "supplement_code": new Text_1.default(2, 3),
    "end_date": new DateField_1.default(5),
    "start_date": new DateField_1.default(13),
    "quote_date": new DateField_1.default(21),
    "description": new Text_1.default(29, 20),
    "short_desc": new Text_1.default(49, 12),
    "suppl_type": new Text_1.default(61, 3),
    "price": new Int_1.default(64, 5),
    "cpf_ticket_type": new Text_1.default(69, 5),
    "min_group_size": new Int_1.default(74, 1),
    "max_group_size": new Int_1.default(75, 1),
    "per_leg_or_dir": new Text_1.default(76, 1),
    "class_type": new Text_1.default(77, 1),
    "capri_code": new Text_1.default(78, 3),
    "sep_tkt_ind": new Text_1.default(81, 1),
    "resvn_type": new Text_1.default(82, 2),
    "sundry_code": new ZeroFillInt_1.default(84, 5)
}));
const supplementRuleRecord = new Record_1.default("supplement_rule", ["rule_number", "end_date"], immutable_1.Map({
    "rule_number": new Int_1.default(2, 3),
    "end_date": new DateField_1.default(5),
    "start_date": new DateField_1.default(13),
    "quote_date": new DateField_1.default(21),
    "train_uid": new Text_1.default(29, 7),
    "train_uid_desc": new Text_1.default(36, 39),
    "fare_class": new Text_1.default(75, 1),
    "quota": new Text_1.default(76, 1),
    "weekend_first": new Text_1.default(77, 1),
    "silver_standard": new Text_1.default(78, 1),
    "railcard": new Text_1.default(79, 1),
    "catering_code": new Text_1.default(80, 1),
    "sleeper": new Text_1.default(81, 1),
    "accom_class": new Text_1.default(82, 1),
    "status": new Text_1.default(83, 1),
    "reservation_status": new Text_1.default(84, 3),
    "sectors": new Text_1.default(87, 3)
}));
const supplementRuleAppliesRecord = new Record_1.default("supplement_rule_applies", ["rule_number", "end_date", "ie_marker", "condition_type", "ie_code"], immutable_1.Map({
    "rule_number": new Int_1.default(2, 3),
    "end_date": new DateField_1.default(5),
    "ie_marker": new Text_1.default(13, 1),
    "condition_type": new Text_1.default(14, 1),
    "ie_code": new Text_1.default(15, 3)
}));
const supplementRuleSupplementRecord = new Record_1.default("supplement_rule_supplement", ["rule_number", "end_date", "supplement_code"], immutable_1.Map({
    "rule_number": new Int_1.default(2, 3),
    "end_date": new DateField_1.default(5),
    "supplement_code": new Text_1.default(13, 3),
    "om_flag": new Text_1.default(16, 1)
}));
const supplementOverrideRecord = new Record_1.default("supplement_override", ["supplement_code", "end_date", "overridden_supplement"], immutable_1.Map({
    "supplement_code": new Text_1.default(2, 3),
    "end_date": new DateField_1.default(5),
    "overridden_supplement": new Text_1.default(13, 3)
}));
const SUP = new MultiRecordFile_1.default(immutable_1.Map({
    "S": supplementRecord,
    "R": supplementRuleRecord,
    "A": supplementRuleAppliesRecord,
    "M": supplementRuleSupplementRecord,
    "O": supplementOverrideRecord
}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SUP;
