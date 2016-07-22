"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const record = new Record_1.default("route", ["route_code", "end_date"], immutable_1.Map({
    "route_code": new Text_1.default(2, 5),
    "end_date": new DateField_1.default(7),
    "start_date": new DateField_1.default(15),
    "quote_date": new DateField_1.default(23),
    "description": new Text_1.default(31, 16),
    "atb_desc_1": new Text_1.default(47, 35),
    "atb_desc_2": new Text_1.default(82, 35),
    "atb_desc_3": new Text_1.default(117, 35),
    "atb_desc_4": new Text_1.default(152, 35),
    "cc_desc": new Text_1.default(187, 16),
    "aaa_desc": new Text_1.default(203, 41),
    "uts_mode": new Text_1.default(244, 1),
    "uts_zone_1": new Text_1.default(245, 1),
    "uts_zone_2": new Text_1.default(246, 1),
    "uts_zone_3": new Text_1.default(247, 1),
    "uts_zone_4": new Text_1.default(248, 1),
    "uts_zone_5": new Text_1.default(249, 1),
    "uts_zone_6": new Text_1.default(250, 1),
    "uts_north": new Text_1.default(251, 3),
    "uts_east": new Text_1.default(254, 3),
    "uts_south": new Text_1.default(257, 3),
    "uts_west": new Text_1.default(260, 3)
}));
const RTE = new SingleRecordFile_1.default(record);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RTE;
