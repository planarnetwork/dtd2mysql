
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const nonDerivableFareRecord = new Record(
    "non_derivable_fare",
    ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "nd_record_type", "end_date"],
    {
        "origin_code": new TextField(1, 4),
        "destination_code": new TextField(5, 4),
        "route_code": new ZeroFillIntField(9, 5, true),
        "railcard_code": new TextField(14, 3),
        "ticket_code": new TextField(17, 3),
        "nd_record_type": new TextField(20, 1),
        "end_date": new DateField(21),
        "start_date": new DateField(29),
        "quote_date": new DateField(37),
        "suppress_mkr": new TextField(45, 1),
        "adult_fare": new IntField(46, 8, true),
        "child_fare": new IntField(54, 8, true),
        "restriction_code": new TextField(62, 2),
        "composite_indicator": new TextField(64, 1),
        "cross_london_ind": new TextField(65, 1),
        "ps_ind": new TextField(66, 1)
    }
);

const NDF = new SingleRecordFile(nonDerivableFareRecord);

export default NDF;