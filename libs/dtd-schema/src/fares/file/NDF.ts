
import {BooleanField, DateField, FixedWidthRecord, IntField, SingleRecordFile, TextField, ZeroFillIntField} from "@gb-transit/feed-parser";

const nonDerivableFareFixedWidthRecord = new FixedWidthRecord(
  "non_derivable_fare",
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
    "composite_indicator": new TextField(64, 1),
    "cross_london_ind": new BooleanField(65),
    "ps_ind": new TextField(66, 1)
  }
);

const NDF = new SingleRecordFile(nonDerivableFareFixedWidthRecord);

export default NDF;