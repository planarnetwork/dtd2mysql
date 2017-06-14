
import {RecordWithManualIdentifier} from "../../../src/feed/record/FixedWidthRecord";
import {TextField} from "../../../src/feed/field/TextField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {BooleanField} from "../../../src/feed/field/BooleanField";
import {ShortDateField} from "../../../src/feed/field/DateField";
import {ForeignKeyField} from "../../../src/feed/field/ForeignKeyField";
import {TimeField} from "../../../src/feed/field/TimeField";
import {MultiFormatRecord} from "../../../src/feed/record/MultiFormatRecord";


const schedule = new RecordWithManualIdentifier(
  "z_schedule",
  ["train_uid", "runs_from", "stp_indicator"], {
    "train_uid": new TextField(3, 6),
    "runs_from": new ShortDateField(9), // todo z train date format is different?
    "runs_to": new ShortDateField(15),
    "monday": new BooleanField(21),
    "tuesday": new BooleanField(22),
    "wednesday": new BooleanField(23),
    "thursday": new BooleanField(24),
    "friday": new BooleanField(25),
    "saturday": new BooleanField(26),
    "sunday": new BooleanField(27),
    "bank_holiday_running": new BooleanField(28, false, ["X"], [" "]),
    "train_status": new TextField(29, 1, true),
    "train_category": new TextField(30, 2, true),
    "train_identity": new TextField(32, 4, true),
    "headcode": new TextField(36, 4, true),
    "course_indicator": new TextField(40, 1, true),
    "profit_center": new TextField(41, 8, true),
    "business_sector": new TextField(49, 1, true),
    "power_type": new TextField(50, 3, true),
    "timing_load": new TextField(53, 4, true),
    "speed": new TextField(57, 3, true),
    "operating_chars": new TextField(60, 6, true),
    "train_class": new TextField(66, 1, true),
    "sleepers": new TextField(67, 1, true),
    "reservations": new TextField(68, 1, true),
    "connect_indicator": new TextField(69, 1, true),
    "catering_code": new TextField(70, 4, true),
    "service_branding": new TextField(74, 4, true),
    "stp_indicator": new TextField(79, 1)
  },
  ["runs_from"]
);

const stopRecordTypes = {
  "LO": {
    "z_schedule": new ForeignKeyField(schedule),
    "location": new TextField(2, 3),
    "scheduled_arrival_time": new TimeField(43, true, [" ", "0"]),
    "scheduled_departure_time": new TimeField(10),
    "scheduled_pass_time": new TimeField(43, true, [" ", "0"]),
    "public_arrival_time": new TimeField(43, true, [" ", "0"]),
    "public_departure_time": new TimeField(15),
    "platform": new TextField(19, 3, true),
    "line": new TextField(22, 3, true),
    "path": new TextField(43, 3, true),
    "activity": new TextField(29, 12, true),
    "engineering_allowance": new TextField(25, 2, true),
    "pathing_allowance": new TextField(27, 2, true),
    "performance_allowance": new TextField(41, 2, true)
  },
  "LI": {
    "z_schedule": new ForeignKeyField(schedule),
    "location": new TextField(2, 3),
    "scheduled_arrival_time": new TimeField(10, true, [" ", "0"]),
    "scheduled_departure_time": new TimeField(15, true, [" ", "0"]),
    "scheduled_pass_time": new TimeField(20, true, [" ", "0"]),
    "public_arrival_time": new TimeField(25, true, [" ", "0"]),
    "public_departure_time": new TimeField(29, true, [" ", "0"]),
    "platform": new TextField(33, 3, true),
    "line": new TextField(36, 3, true),
    "path": new TextField(39, 3, true),
    "activity": new TextField(42, 12, true),
    "engineering_allowance": new TextField(54, 2, true),
    "pathing_allowance": new TextField(56, 2, true),
    "performance_allowance": new TextField(58, 2, true)
  },
  "LT": {
    "z_schedule": new ForeignKeyField(schedule),
    "location": new TextField(2, 3),
    "scheduled_arrival_time": new TimeField(10),
    "scheduled_departure_time": new TimeField(43, true, [" ", "0"]),
    "scheduled_pass_time": new TimeField(43, true, [" ", "0"]),
    "public_arrival_time": new TimeField(15),
    "public_departure_time": new TimeField(43, true, [" ", "0"]),
    "platform": new TextField(19, 3, true),
    "line": new TextField(43, 3, true),
    "path": new TextField(22, 3, true),
    "activity": new TextField(25, 12, true),
    "engineering_allowance": new TextField(54, 2, true),
    "pathing_allowance": new TextField(56, 2, true),
    "performance_allowance": new TextField(58, 2, true)
  }
};

const stop = new MultiFormatRecord(
  "z_stop",
  ["z_schedule", "location", "public_departure_time"],
  stopRecordTypes.LI,
  stopRecordTypes,
  0, 2
);


const ZTR = new MultiRecordFile({
  "BS": schedule,
  "LO": stop,
  "LI": stop,
  "LT": stop
}, 0, 2);

export default ZTR;