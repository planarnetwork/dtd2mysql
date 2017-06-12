
import {TextField} from "../../../src/feed/field/TextField";
import {IntField, ZeroFillIntField} from "../../../src/feed/field/IntField";
import {DateField} from "../../../src/feed/field/DateField";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";

const flowFixedWidthRecord = new FixedWidthRecord(
  "flow",
  ["origin_code", "destination_code", "route_code", "status_code", "usage_code", "direction", "end_date"],
  {
    "origin_code": new TextField(2, 4),
    "destination_code": new TextField(6, 4),
    "route_code": new ZeroFillIntField(10, 5),
    "status_code": new ZeroFillIntField(15, 3),
    "usage_code": new TextField(18, 1),
    "direction": new TextField(19, 1),
    "end_date": new DateField(20),
    "start_date": new DateField(28),
    "toc": new TextField(36, 3),
    "cross_london_ind": new IntField(39, 1),
    "ns_disc_ind": new IntField(40, 1),
    "publication_ind": new TextField(41, 1),
    "flow_id": new IntField(42, 7),
  }
);

const fareFixedWidthRecord = new FixedWidthRecord(
  "fare",
  ["flow_id", "ticket_code"],
  {
    "flow_id": new IntField(2, 7),
    "ticket_code": new TextField(9, 3),
    "fare": new IntField(12, 8),
    "restriction_code": new TextField(20, 2, true)
  }
);

const FFL = new MultiRecordFile({
  "F": flowFixedWidthRecord,
  "T": fareFixedWidthRecord
});

export default FFL;