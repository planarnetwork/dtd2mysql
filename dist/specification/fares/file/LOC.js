"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const location = new Record_1.default("location", ["uic", "end_date", "start_date"], immutable_1.Map({
    "uic": new Text_1.default(2, 7),
    "end_date": new DateField_1.default(9),
    "start_date": new DateField_1.default(17),
    "quote_date": new DateField_1.default(25),
    "nlc": new Text_1.default(36, 4),
    "description": new Text_1.default(40, 16),
    "crs": new Text_1.default(56, 3),
    "resv": new Text_1.default(59, 5),
    "ers_country": new Text_1.default(64, 2),
    "ers_code": new Text_1.default(66, 3),
    "fare_group": new Text_1.default(69, 6),
    "county": new Text_1.default(75, 2),
    "pte_code": new Text_1.default(77, 2),
    "zone_no": new Text_1.default(79, 4),
    "zone_ind": new Text_1.default(83, 2),
    "region": new Text_1.default(85, 1),
    "hierarchy": new Text_1.default(86, 1),
    "cc_desc_out": new Text_1.default(87, 41),
    "cc_desc_rtn": new Text_1.default(128, 16),
    "atb_desc_out": new Text_1.default(144, 60),
    "atb_desc_rtn": new Text_1.default(204, 30),
    "special_facilities": new Text_1.default(234, 26),
    "lul_direction_ind": new Text_1.default(260, 1),
    "lul_uts_mode": new Text_1.default(261, 1),
    "lul_zone_1": new Text_1.default(262, 1),
    "lul_zone_2": new Text_1.default(263, 1),
    "lul_zone_3": new Text_1.default(264, 1),
    "lul_zone_4": new Text_1.default(265, 1),
    "lul_zone_5": new Text_1.default(266, 1),
    "lul_zone_6": new Text_1.default(267, 1),
    "lul_uts_london_stn": new Text_1.default(268, 1),
    "uts_code": new Text_1.default(269, 3),
    "uts_a_code": new Text_1.default(272, 3),
    "uts_ptr_bias": new Text_1.default(275, 1),
    "uts_offset": new Text_1.default(276, 1),
    "uts_north": new Text_1.default(277, 3),
    "uts_east": new Text_1.default(280, 3),
    "uts_south": new Text_1.default(283, 3),
    "uts_west": new Text_1.default(286, 3)
}));
const association = new Record_1.default("location_association", ["uic_code", "end_date", "assoc_uic_code"], immutable_1.Map({
    "uic_code": new Text_1.default(2, 7),
    "end_date": new DateField_1.default(9),
    "assoc_uic_code": new Text_1.default(17, 7),
    "assoc_crs_code": new Text_1.default(24, 3)
}));
const railcard = new Record_1.default("location_railcard", ["uic_code", "railcard_code", "end_date"], immutable_1.Map({
    "uic_code": new Text_1.default(2, 7),
    "railcard_code": new Text_1.default(9, 3),
    "end_date": new DateField_1.default(12)
}));
const group = new Record_1.default("location_group", ["group_uic_code", "end_date"], immutable_1.Map({
    "group_uic_code": new Text_1.default(2, 7),
    "end_date": new DateField_1.default(9),
    "start_date": new DateField_1.default(17),
    "quote_date": new DateField_1.default(25),
    "description": new Text_1.default(33, 16),
    "ers_country": new Text_1.default(49, 2),
    "ers_code": new Text_1.default(51, 3)
}));
const groupMember = new Record_1.default("location_group_member", ["group_uic_code", "end_date", "member_uic_code"], immutable_1.Map({
    "group_uic_code": new Text_1.default(2, 7),
    "end_date": new DateField_1.default(9),
    "member_uic_code": new Text_1.default(17, 7),
    "member_crs_code": new Text_1.default(24, 3)
}));
const synonym = new Record_1.default("location_synonym", ["uic_code", "end_date", "start_date", "description"], immutable_1.Map({
    "uic_code": new Text_1.default(2, 7),
    "end_date": new DateField_1.default(9),
    "start_date": new DateField_1.default(17),
    "description": new Text_1.default(25, 16)
}));
const LOC = new MultiRecordFile_1.default(immutable_1.Map({
    "L": location,
    "A": association,
    "G": group,
    "M": groupMember,
    "S": synonym,
    "R": railcard
}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LOC;
