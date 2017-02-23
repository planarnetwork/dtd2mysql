"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const record = new Record_1.default("toc_specific_ticket", ["ticket_code", "restriction_code", "restriction_flag", "direction", "toc_id", "toc_type", "end_date"], immutable_1.Map({
    "ticket_code": new Text_1.default(0, 3),
    "restriction_code": new Text_1.default(3, 2),
    "restriction_flag": new Text_1.default(5, 1),
    "direction": new Text_1.default(6, 1),
    "toc_id": new Text_1.default(7, 2),
    "toc_type": new Text_1.default(9, 1),
    "end_date": new DateField_1.default(10),
    "start_date": new DateField_1.default(18),
    "sleeper_mkr": new Text_1.default(26, 1),
    "inc_exc_stock": new Text_1.default(27, 1),
    "stock_list": new Text_1.default(28, 40)
}));
const TSP = new SingleRecordFile_1.default(record);
exports.default = TSP;
