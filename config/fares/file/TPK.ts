
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";

const pkg = new FixedWidthRecord(
  "package",
  ["package_code", "end_date"],
  {
    "package_code": new TextField(1, 3),
    "end_date": new DateField(4),
    "start_date": new DateField(12),
    "quote_date": new DateField(20),
    "restriction_code": new TextField(28, 2, true),
    "origin_facilities": new TextField(30, 26, true),
    "destination_facilities": new TextField(56, 26, true)
  }
);

const supplement = new FixedWidthRecord(
  "package_supplement",
  ["package_code", "end_date", "supplement_code"],
  {
    "package_code": new TextField(1, 3),
    "end_date": new DateField(4),
    "supplement_code": new TextField(12, 3),
    "direction": new TextField(15, 1),
    "pack_number": new TextField(16, 3),
    "origin_facility": new TextField(19, 1, true),
    "dest_facility": new TextField(20, 1, true)
  }
);

const TPK = new MultiRecordFile({
  "P": pkg,
  "S": supplement
}, 0);

export default TPK;