"use strict";
const immutable_1 = require('immutable');
const Record_1 = require("../../../feed/record/Record");
const ZeroFillInt_1 = require("../../../feed/field/ZeroFillInt");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const MultiRecordFile_1 = require("../../../feed/file/MultiRecordFile");
const Time_1 = require("../../../feed/field/Time");
const dates = new Record_1.default("restriction_date", ["cf_mkr"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "start_date": new DateField_1.default(4),
    "end_date": new DateField_1.default(12),
    "atb_desc": new Text_1.default(20, 5),
}));
const header = new Record_1.default("restriction_header", ["cf_mkr", "restriction_code"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "description": new Text_1.default(6, 30),
    "desc_out": new Text_1.default(36, 50),
    "desc_ret": new Text_1.default(86, 50),
    "type_out": new Text_1.default(136, 1),
    "type_ret": new Text_1.default(137, 1),
    "change_ind": new Text_1.default(138, 1),
}));
const headerDate = new Record_1.default("restriction_header_date", ["cf_mkr", "restriction_code"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "date_from": new Text_1.default(6, 4),
    "date_to": new Text_1.default(10, 4),
    "days": new Text_1.default(14, 7)
}));
const headerLocation = new Record_1.default("restriction_header_route_location", ["cf_mkr", "restriction_code", "location_crs_code"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "location_crs_code": new Text_1.default(6, 3),
}));
const headerChanges = new Record_1.default("restriction_header_allowed_change", ["cf_mkr", "restriction_code", "allowed_change"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "allowed_change": new Text_1.default(6, 3),
}));
const headerAdditional = new Record_1.default("restriction_header_additional_restriction", ["cf_mkr", "restriction_code", "additional_restriction", "origin", "destination"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "additional_restriction": new Text_1.default(6, 2),
    "origin": new Text_1.default(9, 3),
    "destination": new Text_1.default(12, 3)
}));
const time = new Record_1.default("restriction_time", ["cf_mkr", "restriction_code", "sequence_no", "out_ret"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "sequence_no": new Text_1.default(6, 4),
    "out_ret": new Text_1.default(10, 1),
    "time_from": new Time_1.default(11),
    "time_to": new Time_1.default(15),
    "arr_dep_via": new Text_1.default(19, 1),
    "location": new Text_1.default(20, 3),
    "rstr_type": new Text_1.default(23, 1),
    "train_type": new Text_1.default(24, 1),
    "min_fare_flag": new Text_1.default(25, 1)
}));
const timeDateBand = new Record_1.default("restriction_time_date", ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "date_from", "date_to"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "sequence_no": new Text_1.default(6, 4),
    "out_ret": new Text_1.default(10, 1),
    "date_from": new Text_1.default(11, 4),
    "date_to": new Text_1.default(15, 4),
    "days": new Text_1.default(19, 7)
}));
const timeToc = new Record_1.default("restriction_time_toc", ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "toc_code"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "sequence_no": new Text_1.default(6, 4),
    "out_ret": new Text_1.default(10, 1),
    "toc_code": new Text_1.default(11, 2)
}));
const timePriviledge = new Record_1.default("restriction_time_priviledge", ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "barred_class", "barred_tickets", "barred_seasons", "barred_first", "from_location", "to_location"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "sequence_no": new Text_1.default(6, 4),
    "out_ret": new Text_1.default(10, 1),
    "barred_class": new Text_1.default(11, 1),
    "barred_tickets": new Text_1.default(12, 1),
    "barred_seasons": new Text_1.default(13, 1),
    "barred_first": new Text_1.default(14, 1),
    "from_location": new Text_1.default(15, 3, true),
    "to_location": new Text_1.default(18, 3, true)
}));
const timePriviledgeException = new Record_1.default("restriction_time_priviledge_exception", ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "pass_exception"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "sequence_no": new Text_1.default(6, 4),
    "out_ret": new Text_1.default(10, 1),
    "pass_exception": new Text_1.default(11, 1)
}));
const train = new Record_1.default("restriction_train", ["cf_mkr", "restriction_code", "train_no", "out_ret"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "train_no": new Text_1.default(6, 6),
    "out_ret": new Text_1.default(12, 1),
    "quota_ind": new Text_1.default(13, 1),
    "sleeper_ind": new Text_1.default(14, 1)
}));
const trainDate = new Record_1.default("restriction_train_date", ["cf_mkr", "restriction_code", "train_no", "out_ret", "date_from", "date_to"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "train_no": new Text_1.default(6, 6),
    "out_ret": new Text_1.default(12, 1),
    "date_from": new Text_1.default(13, 4),
    "date_to": new Text_1.default(17, 4),
    "days": new Text_1.default(21, 7)
}));
const trainQuota = new Record_1.default("restriction_train_quota", ["cf_mkr", "restriction_code", "train_no", "out_ret", "location", "quota_ind", "arr_dep"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "train_no": new Text_1.default(6, 6),
    "out_ret": new Text_1.default(12, 1),
    "location": new Text_1.default(13, 3),
    "quota_ind": new Text_1.default(16, 1),
    "arr_dep": new Text_1.default(17, 1)
}));
const trainPriviledge = new Record_1.default("restriction_train_priviledge", ["cf_mkr", "restriction_code", "train_no", "out_ret", "barred_class", "barred_tickets", "barred_seasons", "barred_first", "from_location", "to_location"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "train_no": new Text_1.default(6, 6),
    "out_ret": new Text_1.default(12, 1),
    "barred_class": new Text_1.default(13, 1),
    "barred_tickets": new Text_1.default(14, 1),
    "barred_seasons": new Text_1.default(15, 1),
    "barred_first": new Text_1.default(16, 1),
    "from_location": new Text_1.default(17, 3, true),
    "to_location": new Text_1.default(20, 3, true)
}));
const trainPriviledgeException = new Record_1.default("restriction_train_priviledge_exception", ["cf_mkr", "restriction_code", "train_no", "out_ret", "pass_exception"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "restriction_code": new Text_1.default(4, 2),
    "train_no": new Text_1.default(6, 6),
    "out_ret": new Text_1.default(12, 1),
    "pass_exception": new Text_1.default(13, 1)
}));
const railcard = new Record_1.default("restriction_railcard", ["cf_mkr", "railcard_code", "sequence_no"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "railcard_code": new Text_1.default(4, 3),
    "sequence_no": new Text_1.default(7, 4),
    "ticket_code": new Text_1.default(11, 3),
    "route_code": new ZeroFillInt_1.default(14, 5),
    "location": new Text_1.default(19, 3),
    "restriction_code": new Text_1.default(22, 2, true),
    "total_ban": new Text_1.default(24, 1, true)
}));
const exceptionCode = new Record_1.default("restriction_exception", ["cf_mkr", "exception_code"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "exception_code": new Text_1.default(4, 1),
    "description": new Text_1.default(5, 50)
}));
const ticketCalendar = new Record_1.default("restriction_ticket_calendar", ["cf_mkr", "ticket_code", "cal_type", "route_code", "country_code", "date_from", "date_to"], immutable_1.Map({
    "cf_mkr": new Text_1.default(3, 1),
    "ticket_code": new Text_1.default(4, 3),
    "cal_type": new Text_1.default(7, 1),
    "route_code": new ZeroFillInt_1.default(8, 5),
    "country_code": new Text_1.default(13, 1),
    "date_from": new Text_1.default(14, 4),
    "date_to": new Text_1.default(18, 4),
    "days": new Text_1.default(22, 7)
}));
const RST = new MultiRecordFile_1.default(immutable_1.Map({
    "RD": dates,
    "RH": header,
    "HD": headerDate,
    "HL": headerLocation,
    "HC": headerChanges,
    "HA": headerAdditional,
    "TR": time,
    "TD": timeDateBand,
    "TT": timeToc,
    "TP": timePriviledge,
    "TE": timePriviledgeException,
    "SR": train,
    "SD": trainDate,
    "SQ": trainQuota,
    "SP": trainPriviledge,
    "SE": trainPriviledgeException,
    "RR": railcard,
    "EC": exceptionCode,
    "CA": ticketCalendar
}), 1, 2);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RST;
