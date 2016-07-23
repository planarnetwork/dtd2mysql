
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const record = new Record(
    "railcard",
    ["railcard_code", "end_date"],
    Map({
        "railcard_code": new Text(0, 3),
        "end_date": new DateField(3),
        "start_date": new DateField(11),
        "quote_date": new DateField(19),
        "holder_type": new Text(27, 1),
        "description": new Text(28, 20),
        "restricted_by_issue": new Text(48, 1),
        "restricted_by_area": new Text(49, 1),
        "restricted_by_train": new Text(50, 1),
        "restricted_by_date": new Text(51, 1),
        "master_code": new Text(52, 3),
        "display_flag": new Text(55, 1),
        "max_passengers": new Int(56, 3),
        "min_passengers": new Int(59, 3),
        "max_holders": new Int(62, 3),
        "min_holders": new Int(65, 3),
        "max_acc_adults": new Int(68, 3),
        "min_acc_adults": new Int(71, 3),
        "max_adults": new Int(74, 3),
        "min_adults": new Int(77, 3),
        "max_children": new Int(80, 3),
        "min_children": new Int(83, 3),
        "price": new Int(86, 8),
        "discount_price": new Int(94, 8),
        "validity_period": new Text(102, 4),
        "last_valid_date": new DateField(106, true),
        "physical_card": new Text(114, 1),
        "capri_ticket_type": new Text(115, 3),
        "adult_status": new Text(118, 3),
        "child_status": new Text(121, 3),
        "aaa_status": new Text(124, 3)
    })
);

const RLC = new SingleRecordFile(record);

export default RLC;