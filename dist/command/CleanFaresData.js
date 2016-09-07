"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class CleanFaresData {
    constructor(container) {
        this.db = container.get("database");
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = CleanFaresData.QUERIES.map(this.db.query);
            yield Promise.all(promises);
        });
    }
}
CleanFaresData.QUERIES = [
    "DELETE FROM flow WHERE flow_id not in (SELECT flow_id FROM fare);",
    "DELETE FROM location WHERE end_date < CURDATE();",
    "DELETE FROM non_derivable_fare WHERE end_date < CURDATE() OR composite_indicator != 'Y';",
    "DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE() OR composite_indicator != 'Y';",
    "DELETE FROM non_standard_discount WHERE end_date < CURDATE();",
    "DELETE FROM railcard WHERE end_date < CURDATE();",
    "DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE();",
];
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CleanFaresData;
