
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {TimeField} from "../../../src/feed/field/TimeField";

const record = new FixedWidthRecord(
  "advance_ticket",
  ["ticket_code", "restriction_code", "restriction_flag", "toc_id", "end_date"],
  {
    "ticket_code": new TextField(0, 3),
    "restriction_code": new TextField(3, 2, true),
    "restriction_flag": new TextField(5, 1),
    "toc_id": new TextField(6, 2, true),
    "end_date": new DateField(8),
    "start_date": new DateField(16),
    "check_type": new TextField(24, 1),
    "ap_data": new TextField(25, 8),
    "booking_time": new TimeField(33, 4)
  }
);

const TAP = new SingleRecordFile(record);

export default TAP;