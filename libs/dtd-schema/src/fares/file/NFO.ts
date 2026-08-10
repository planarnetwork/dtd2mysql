
import {BooleanField, DateField, FixedWidthRecord, IntField, RecordAction, SingleRecordFile, TextField, ZeroFillIntField} from "@gb-rail/feed-parser";

const nonDerivableFareFixedWidthRecord = new FixedWidthRecord(
  "non_derivable_fare_override",
  ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "nd_record_type", "end_date"],
  {
    "origin_code": new TextField(1, 4),
    "destination_code": new TextField(5, 4),
    "route_code": new ZeroFillIntField(9, 5, true),
    "railcard_code": new TextField(14, 3, false, []),
    "ticket_code": new TextField(17, 3),
    "nd_record_type": new TextField(20, 1),
    "end_date": new DateField(21),
    "start_date": new DateField(29),
    "quote_date": new DateField(37),
    "suppress_mkr": new BooleanField(45),
    "adult_fare": new IntField(46, 8, true),
    "child_fare": new IntField(54, 8, true),
    "restriction_code": new TextField(62, 2, true),
    "composite_indicator": new TextField(64, 1, true),
    "cross_london_ind": new BooleanField(65, true),
    "ps_ind": new TextField(66, 1, true)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const NFO = new SingleRecordFile(nonDerivableFareFixedWidthRecord);

export default NFO;
