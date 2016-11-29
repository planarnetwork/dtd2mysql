"use strict";
const immutable_1 = require("immutable");
const Record_1 = require("../../../feed/record/Record");
const DateField_1 = require("../../../feed/field/DateField");
const Text_1 = require("../../../feed/field/Text");
const SingleRecordFile_1 = require("../../../feed/file/SingleRecordFile");
const clusterRecord = new Record_1.default("station_cluster", ["cluster_id", "cluster_nlc", "end_date"], immutable_1.Map({
    "cluster_id": new Text_1.default(1, 4),
    "cluster_nlc": new Text_1.default(5, 4),
    "end_date": new DateField_1.default(9),
    "start_date": new DateField_1.default(17)
}));
const FSC = new SingleRecordFile_1.default(clusterRecord);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FSC;
