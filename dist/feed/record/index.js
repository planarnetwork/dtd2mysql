///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>
"use strict";
const Record_1 = require("./Record");
const Text_1 = require("../field/Text");
const DateField_1 = require("../field/DateField");
const Int_1 = require("../field/Int");
const ZeroFillInt_1 = require("../field/ZeroFillInt");
const immutable_1 = require('immutable');
exports.FlowRecord = new Record_1.default("flow", ["origin_code", "destination_code", "route_code", "status_code", "usage_code", "direction", "end_date"], immutable_1.Map({
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
