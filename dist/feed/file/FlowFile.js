///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>
"use strict";
const FlowRecord_1 = require('../record/FlowRecord');
const Immutable = require('immutable');
class FlowFile {
    constructor() {
        this.extension = "FFL";
        this.recordTypes = Immutable.Map({
            "F": new FlowRecord_1.default()
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FlowFile;
