"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Int_1 = require("./Int");
class ZeroFillInt extends Int_1.default {
    getType() {
        return super.getType() + " zerofill";
    }
}
exports.default = ZeroFillInt;
