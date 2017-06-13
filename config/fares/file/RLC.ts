
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {IntField} from "../../../src/feed/field/IntField";
import {BooleanField} from "../../../src/feed/field/BooleanField";

const record = new FixedWidthRecord(
  "railcard",
  ["railcard_code", "end_date"],
  {
    "railcard_code": new TextField(0, 3, false,  []),
    "end_date": new DateField(3),
    "start_date": new DateField(11),
    "quote_date": new DateField(19),
    "holder_type": new TextField(27, 1),
    "description": new TextField(28, 20),
    "restricted_by_issue": new BooleanField(48),
    "restricted_by_area": new BooleanField(49),
    "restricted_by_train": new BooleanField(50),
    "restricted_by_date": new BooleanField(51),
    "master_code": new TextField(52, 3, true),
    "display_flag": new TextField(55, 1),
    "max_passengers": new IntField(56, 3, false, []),
    "min_passengers": new IntField(59, 3, false, []),
    "max_holders": new IntField(62, 3, false, []),
    "min_holders": new IntField(65, 3, false, []),
    "max_acc_adults": new IntField(68, 3, false, []),
    "min_acc_adults": new IntField(71, 3, false, []),
    "max_adults": new IntField(74, 3, false, []),
    "min_adults": new IntField(77, 3, false, []),
    "max_children": new IntField(80, 3, false, []),
    "min_children": new IntField(83, 3, false, []),
    "price": new IntField(86, 8, true),
    "discount_price": new IntField(94, 8, true),
    "validity_period": new TextField(102, 4, true),
    "last_valid_date": new DateField(106, true),
    "physical_card": new BooleanField(114),
    "capri_ticket_type": new TextField(115, 3, true),
    "adult_status": new TextField(118, 3, true, [" ", "X"]),
    "child_status": new TextField(121, 3, true, [" ", "X"]),
    "aaa_status": new TextField(124, 3, true)
  }
);

const RLC = new SingleRecordFile(record);

export default RLC;