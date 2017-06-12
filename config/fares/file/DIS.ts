import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {IntField} from "../../../src/feed/field/IntField";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {BooleanField} from "../../../src/feed/field/BooleanField";

const statusDiscount = new FixedWidthRecord(
  "status_discount",
  ["status_code", "end_date", "discount_category"],
  {
    "status_code": new TextField(1, 3),
    "end_date": new DateField(4),
    "discount_category": new IntField(12, 2),
    "discount_indicator": new TextField(14, 1),
    "discount_percentage": new IntField(15, 3)
  }
);

const status = new FixedWidthRecord(
  "status",
  ["status_code", "end_date"],
  {
    "status_code": new TextField(1, 3),
    "end_date": new DateField(4),
    "start_date": new DateField(12),
    "atb_desc": new TextField(20, 5, true),
    "cc_desc": new TextField(25, 5, true),
    "uts_code": new TextField(30, 1),
    "first_single_max_flat": new IntField(31, 8, true),
    "first_return_max_flat": new IntField(39, 8, true),
    "std_single_max_flat": new IntField(47, 8, true),
    "std_return_max_flat": new IntField(55, 8, true),
    "first_lower_min": new IntField(63, 8, true),
    "first_higher_min": new IntField(71, 8, true),
    "std_lower_min": new IntField(79, 8, true),
    "std_higher_min": new IntField(87, 8, true),
    "fs_mkr": new BooleanField(95),
    "fr_mkr": new BooleanField(96),
    "ss_mkr": new BooleanField(97),
    "sr_mkr": new BooleanField(98)
  }
);

const DIS = new MultiRecordFile({
  "S": status,
  "D": statusDiscount
}, 0);

export default DIS;