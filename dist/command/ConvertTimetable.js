"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("fs");
const NATIVE_SCHEMA = __dirname + "/../../asset/native-schema.sql";
class ConvertTimetable {
    constructor(container) {
        this.db = container.get("database");
        this.logger = container.get("logger");
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(this.createSchema());
            this.logger("Converting feed");
            const copyTimetable = this.db.query(`
            SET @prevDepart := '00:00:00';
            SET @prevStation := '   ';
            INSERT INTO timetable_connection
            SELECT @prevDepart, arrival_time, IF (stop_sequence = 1, '   ', @prevStation), parent_station, train_uid, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date, atoc_code, IF (train_category='BS' OR train_category='BR', 'bus', 'train'), @prevStation := parent_station, @prevDepart := departure_time
            FROM stop_times
            LEFT JOIN stops USING (stop_id)
            LEFT JOIN trips USING (trip_id)
            LEFT JOIN calendar USING (service_id)
            ORDER BY trip_id, stop_sequence
        `);
            const clean = this.db.query(`
            DELETE FROM timetable_connection WHERE origin = '   ' OR origin = destination OR departure_time > arrival_time
        `);
            const copyInterchange = this.db.query(`
            INSERT INTO interchange SELECT from_stop_id, min_transfer_time FROM transfers        
        `);
            return Promise.all([copyTimetable, clean, copyInterchange]);
        });
    }
    createSchema() {
        const nativeSchema = fs.readFileSync(NATIVE_SCHEMA, "utf-8");
        return nativeSchema.split(";").map(this.db.query);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConvertTimetable;
