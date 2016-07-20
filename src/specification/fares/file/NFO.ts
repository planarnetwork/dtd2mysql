
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const nonDerivableFareRecord = new Record(
    "non_derivable_fare_override",
    ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "nd_record_type", "end_date"],
    Map({
        "origin_code": new Text(1, 4),
        "destination_code": new Text(5, 4),
        "route_code": new ZeroFillInt(9, 5),
        "railcard_code": new Text(14, 3),
        "ticket_code": new Text(17, 3),
        "nd_record_type": new Text(20, 1),
        "end_date": new DateField(21),
        "start_date": new DateField(29),
        "quote_date": new DateField(37),
        "suppress_mkr": new Text(45, 1),
        "adult_fare": new Int(46, 8, true),
        "child_fare": new Int(55, 8, true),
        "restriction_code": new Text(62, 2),
        "composite_indicator": new Text(64, 1),
        "cross_london_ind": new Text(65, 1),
        "ps_ind": new Text(66, 1)
    })
);

const NFO = new SingleRecordFile(nonDerivableFareRecord);

export default NFO;
