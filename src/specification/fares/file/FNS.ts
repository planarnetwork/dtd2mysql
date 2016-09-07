
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const discountRecord = new Record(
    "non_standard_discount",
    ["origin_code", "destination_code", "route_code", "railcard_code", "ticket_code", "end_date"],
    Map({
        "origin_code": new Text(1, 4, true),
        "destination_code": new Text(5, 4, true),
        "route_code": new ZeroFillInt(9, 5, true),
        "railcard_code": new Text(14, 3, true),
        "ticket_code": new Text(17, 3),
        "end_date": new DateField(20),
        "start_date": new DateField(28),
        "quote_date": new DateField(36),
        "use_nlc": new Text(44, 4),
        "adult_nodis_flag": new Text(48, 1),
        "adult_add_on_amount": new Int(49, 8, true),
        "adult_rebook_flag": new Text(57, 1),
        "child_nodis_flag": new Text(58, 1),
        "child_add_on_amount": new Int(59, 8, true),
        "child_rebook_flag": new Text(67, 1)
    })
);

const FNS = new SingleRecordFile(discountRecord);

export default FNS;