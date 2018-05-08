
import {FixedWidthRecord, RecordWithManualIdentifier} from "../../../src/feed/record/FixedWidthRecord";
import {TextField, VariableLengthText} from "../../../src/feed/field/TextField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {BooleanField} from "../../../src/feed/field/BooleanField";
import {ShortDateField} from "../../../src/feed/field/DateField";
import {IntField} from "../../../src/feed/field/IntField";
import {ForeignKeyField} from "../../../src/feed/field/ForeignKeyField";
import {TimeField} from "../../../src/feed/field/TimeField";
import {MultiFormatRecord} from "../../../src/feed/record/MultiFormatRecord";
import {RecordAction} from "../../../src/feed/record/Record";

const tiplocInsert = new FixedWidthRecord(
  "tiploc",
  ["tiploc_code"], {
    "tiploc_code": new TextField(2, 7),
    "capitals": new TextField(9, 2),
    "nalco": new TextField(11, 6),
    "nlc_check_character": new TextField(17, 1),
    "tps_description": new TextField(18, 26),
    "stanox": new TextField(44, 5),
    "po_mcp_code": new IntField(49, 4),
    "crs_code": new TextField(53, 3, true),
    "description": new TextField(56, 16, true)
  }
);

const association = new FixedWidthRecord(
  "association",
  ["base_uid", "assoc_uid", "assoc_location", "start_date", "stp_indicator"], {
    "base_uid": new TextField(3, 6),
    "assoc_uid": new TextField(9, 6),
    "start_date": new ShortDateField(15),
    "end_date": new ShortDateField(21),
    "monday": new BooleanField(27),
    "tuesday": new BooleanField(28),
    "wednesday": new BooleanField(29),
    "thursday": new BooleanField(30),
    "friday": new BooleanField(31),
    "saturday": new BooleanField(32),
    "sunday": new BooleanField(33),
    "assoc_cat": new TextField(34, 2, true),
    "assoc_date_ind": new TextField(36, 1, true),
    "assoc_location": new TextField(37, 7),
    "base_location_suffix": new TextField(44, 1, false, []),
    "assoc_location_suffix": new TextField(45, 1, false, []),
    "association_type": new TextField(47, 1, true),
    "stp_indicator": new TextField(79, 1)
  },
  ["end_date"],
  {
    "N": RecordAction.Insert,
    "R": RecordAction.Update,
    "D": RecordAction.Delete
  },
  2
);

const schedule = new RecordWithManualIdentifier(
  "schedule",
  ["train_uid", "runs_from", "stp_indicator"], {
    "train_uid": new TextField(3, 6),
    "runs_from": new ShortDateField(9),
    "runs_to": new ShortDateField(15),
    "monday": new BooleanField(21),
    "tuesday": new BooleanField(22),
    "wednesday": new BooleanField(23),
    "thursday": new BooleanField(24),
    "friday": new BooleanField(25),
    "saturday": new BooleanField(26),
    "sunday": new BooleanField(27),
    "bank_holiday_running": new BooleanField(28, false, [" "], ["X"], []),
    "train_status": new TextField(29, 1, true),
    "train_category": new TextField(30, 2, true),
    "train_identity": new TextField(32, 4, true),
    "headcode": new TextField(36, 4, true),
    "course_indicator": new TextField(40, 1),
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
  ["runs_from"],
  {
    "N": RecordAction.Insert,
    "R": RecordAction.Update,
    "D": RecordAction.Delete
  },
  2
);

const extraDetails = new FixedWidthRecord(
  "schedule_extra",
  [], {
    "schedule": new ForeignKeyField(schedule),
    "traction_class": new TextField(2, 4, true),
    "uic_code": new TextField(6, 5, true),
    "atoc_code": new TextField(11, 2),
    "applicable_timetable_code": new TextField(13, 1),
    "retail_train_id": new TextField(14, 8, true),
    "source": new TextField(22, 1, true)
  },
  ["schedule"]
);

const stopRecordTypes = {
  "LO": {
    "schedule": new ForeignKeyField(schedule),
    "location": new TextField(2, 7),
    "suffix": new IntField(9, 1, true),
    "scheduled_arrival_time": new TimeField(43, 5),
    "scheduled_departure_time": new TimeField(10, 5),
    "scheduled_pass_time": new TimeField(43, 5),
    "public_arrival_time": new TimeField(43, 4),
    "public_departure_time": new TimeField(15, 4),
    "platform": new TextField(19, 3, true),
    "line": new TextField(22, 3, true),
    "path": new TextField(43, 3, true),
    "activity": new VariableLengthText(29, 12, false, []),
    "engineering_allowance": new TextField(25, 2, true),
    "pathing_allowance": new TextField(27, 2, true),
    "performance_allowance": new TextField(41, 2, true)
  },
  "LI": {
    "schedule": new ForeignKeyField(schedule),
    "location": new TextField(2, 7),
    "suffix": new IntField(9, 1, true),
    "scheduled_arrival_time": new TimeField(10, 5),
    "scheduled_departure_time": new TimeField(15, 5),
    "scheduled_pass_time": new TimeField(20, 5),
    "public_arrival_time": new TimeField(25, 4),
    "public_departure_time": new TimeField(29, 4),
    "platform": new TextField(33, 3, true),
    "line": new TextField(36, 3, true),
    "path": new TextField(39, 3, true),
    "activity": new VariableLengthText(42, 12, false, []),
    "engineering_allowance": new TextField(54, 2, true),
    "pathing_allowance": new TextField(56, 2, true),
    "performance_allowance": new TextField(58, 2, true)
  },
  "LT": {
    "schedule": new ForeignKeyField(schedule),
    "location": new TextField(2, 7),
    "suffix": new IntField(9, 1, true),
    "scheduled_arrival_time": new TimeField(10, 5),
    "scheduled_departure_time": new TimeField(43, 5),
    "scheduled_pass_time": new TimeField(43, 5),
    "public_arrival_time": new TimeField(15, 4),
    "public_departure_time": new TimeField(43, 4),
    "platform": new TextField(19, 3, true),
    "line": new TextField(43, 3, true),
    "path": new TextField(22, 3, true),
    "activity": new VariableLengthText(25, 12, false, []),
    "engineering_allowance": new TextField(54, 2, true),
    "pathing_allowance": new TextField(56, 2, true),
    "performance_allowance": new TextField(58, 2, true)
  }
};

const stop = new MultiFormatRecord(
  "stop_time",
  ["schedule", "location", "suffix",  "public_departure_time"],
  stopRecordTypes.LI,
  stopRecordTypes,
  0, 2
);


const MCA = new MultiRecordFile({
  "AA": association,
  "TI": tiplocInsert,
  "TA": tiplocInsert,
  "BS": schedule,
  "BX": extraDetails,
  "LO": stop,
  "LI": stop,
  "LT": stop
}, 0, 2);

export default MCA;