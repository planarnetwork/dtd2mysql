
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {IntField} from "../../../src/feed/field/IntField";
import {BooleanField} from "../../../src/feed/field/BooleanField";
import {RecordAction} from "../../../src/feed/record/Record";

const ticketTypeFixedWidthRecord = new FixedWidthRecord(
  "ticket_type",
  ["ticket_code", "end_date"],
  {
    "ticket_code": new TextField(1, 3),
    "end_date": new DateField(4   ),
    "start_date": new DateField(12),
    "quote_date": new DateField(20),
    "description": new TextField(28, 15),
    "tkt_class": new IntField(43, 1, false, []),
    "tkt_type": new TextField(44, 1),
    "tkt_group": new TextField(45, 1),
    "last_valid_day": new DateField(46),
    "max_passengers": new IntField(54, 3, false, []),
    "min_passengers": new IntField(57, 3, false, []),
    "max_adults": new IntField(60, 3, false, []),
    "min_adults": new IntField(63, 3, false, []),
    "max_children": new IntField(66, 3, false, []),
    "min_children": new IntField(69, 3, false, []),
    "restricted_by_date": new BooleanField(72),
    "restricted_by_train": new BooleanField(73),
    "restricted_by_area": new BooleanField(74),
    "validity_code": new TextField(75, 2),
    "atb_description": new TextField(77, 20),
    "lul_xlondon_issue": new IntField(97, 1),
    "reservation_required": new TextField(98, 1),
    "capri_code": new TextField(99, 3),
    "lul_93": new BooleanField(102, true),
    "uts_code": new TextField(103, 2),
    "time_restriction": new IntField(105, 1, true),
    "free_pass_lul": new BooleanField(106, true),
    "package_mkr": new TextField(107, 1),
    "fare_multiplier": new IntField(108, 3),
    "discount_category": new IntField(111, 2)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const TTY = new SingleRecordFile(ticketTypeFixedWidthRecord);

export default TTY;