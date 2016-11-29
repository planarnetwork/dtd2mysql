"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class CleanTimetableData {
    constructor(container) {
        this.db = container.get("database");
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = CleanTimetableData.QUERIES.map(q => this.db.query(q));
            yield Promise.all(promises);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CleanTimetableData;
CleanTimetableData.QUERIES = [
    "DELETE trips, stop_times FROM trips JOIN stop_times USING(trip_id) JOIN calendar USING(service_id) WHERE CURDATE() > end_date",
];
