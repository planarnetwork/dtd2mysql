import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {IntField, ZeroFillIntField} from "../../../src/feed/field/IntField";
import {TextField} from "../../../src/feed/field/TextField";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {DateField} from "../../../src/feed/field/DateField";

const discountFixedWidthRecord = new FixedWidthRecord(
  "non_standard_discount",
  ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "end_date"],
  {
    "origin_code": new TextField(1, 4, true),
    "destination_code": new TextField(5, 4, true),
    "route_code": new ZeroFillIntField(9, 5, true),
    "railcard_code": new TextField(14, 3),
    "ticket_code": new TextField(17, 3),
    "end_date": new DateField(20),
    "start_date": new DateField(28),
    "quote_date": new DateField(36),
    "use_nlc": new TextField(44, 4, true),
    "adult_nodis_flag": new TextField(48, 1),
    "adult_add_on_amount": new IntField(49, 8, true),
    "adult_rebook_flag": new TextField(57, 1),
    "child_nodis_flag": new TextField(58, 1),
    "child_add_on_amount": new IntField(59, 8, true),
    "child_rebook_flag": new TextField(67, 1)
  }
);

const FNS = new SingleRecordFile(discountFixedWidthRecord);

export default FNS;