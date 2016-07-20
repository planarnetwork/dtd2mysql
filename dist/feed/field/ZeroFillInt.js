"use strict";
const Int_1 = require("./Int");
class ZeroFillInt extends Int_1.default {
    getType() {
        return super.getType() + " zerofill";
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ZeroFillInt;
