
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {BooleanField} from "../../../src/feed/field/BooleanField";

const record = new FixedWidthRecord(
  "toc_specific_ticket",
  ["ticket_code", "restriction_code", "restriction_flag", "direction", "toc_id", "toc_type", "end_date"],
  {
    "ticket_code": new TextField(0, 3),
    "restriction_code": new TextField(3, 2, true),
    "restriction_flag": new TextField(5, 1),
    "direction": new TextField(6, 1),
    "toc_id": new TextField(7, 2, true),
    "toc_type": new TextField(9, 1),
    "end_date": new DateField(10),
    "start_date": new DateField(18),
    "sleeper_mkr": new BooleanField(26),
    "inc_exc_stock": new TextField(27, 1),
    "stock_list": new TextField(28, 40, true)
  }
);

const TSP = new SingleRecordFile(record);

export default TSP;