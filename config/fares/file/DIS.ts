import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {IntField} from "../../../src/feed/field/IntField";

const statusDiscount = new Record(
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

const status = new Record(
  "status",
  ["status_code", "end_date"],
  {
    "status_code": new TextField(1, 3),
    "end_date": new DateField(4),
    "start_date": new DateField(12),
    "atb_desc": new TextField(20, 5),
    "cc_desc": new TextField(25, 5),
    "uts_code": new TextField(30, 1),
    "first_single_max_flat": new IntField(31, 8),
    "first_return_max_flat": new IntField(39, 8),
    "std_single_max_flat": new IntField(47, 8),
    "std_return_max_flat": new IntField(55, 8),
    "first_lower_min": new IntField(63, 8),
    "first_higher_min": new IntField(71, 8),
    "std_lower_min": new IntField(79, 8),
    "std_higher_min": new IntField(87, 8),
    "fs_mkr": new TextField(95, 1),
    "fr_mkr": new TextField(96, 1),
    "ss_mkr": new TextField(97, 1),
    "sr_mkr": new TextField(98, 1)
  }
);

const DIS = new MultiRecordFile({
  "S": status,
  "D": statusDiscount
}, 0);

export default DIS;