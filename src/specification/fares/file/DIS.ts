
import {Map} from 'immutable';
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const statusDiscount = new Record(
    "status_discount",
    ["status_code", "end_date", "discount_category"],
    Map({
        "status_code": new Text(1, 3),
        "end_date": new DateField(4),
        "discount_category": new Int(12, 2),
        "discount_indicator": new Text(14, 1),
        "discount_percentage": new Int(15, 3)
    })
);

const status = new Record(
    "status",
    ["status_code", "end_date"],
    Map({
        "status_code": new Text(1, 3),
        "end_date": new DateField(4),
        "start_date": new DateField(12),
        "atb_desc": new Text(20, 5),
        "cc_desc": new Text(25, 5),
        "uts_code": new Text(30, 1),
        "first_single_max_flat": new Int(31, 8),
        "first_return_max_flat": new Int(39, 8),
        "std_single_max_flat": new Int(47, 8),
        "std_return_max_flat": new Int(55, 8),
        "first_lower_min": new Int(63, 8),
        "first_higher_min": new Int(71, 8),
        "std_lower_min": new Int(79, 8),
        "std_higher_min": new Int(87, 8),
        "fs_mkr": new Text(95, 1),
        "fr_mkr": new Text(96, 1),
        "ss_mkr": new Text(97, 1),
        "sr_mkr": new Text(98, 1)
    })
);

const DIS = new MultiRecordFile(Map({
    "S": status,
    "D": statusDiscount
}), 0);

export default DIS;