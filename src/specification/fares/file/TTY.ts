
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const ticketTypeRecord = new Record(
    "ticket_type",
    ["ticket_code", "end_date"],
    Map({
        "ticket_code": new Text(1, 3),
        "end_date": new DateField(3),
        "start_date": new DateField(12),
        "quote_date": new DateField(20),
        "description": new Text(28, 15),
        "tkt_class": new Int(43, 1),
        "tkt_type": new Text(44, 1),
        "tkt_group": new Text(45, 1),
        "last_valid_day": new DateField(46),
        "max_passengers": new Int(54, 3),
        "min_passengers": new Int(57, 3),
        "max_adults": new Int(60, 3),
        "min_adults": new Int(63, 3),
        "max_children": new Int(66, 3),
        "min_children": new Int(69, 3),
        "restricted_by_date": new Text(72, 1),
        "restricted_by_train": new Text(73, 1),
        "restricted_by_area": new Text(74, 1),
        "validity_code": new Text(75, 2),
        "atb_description": new Text(77, 20),
        "lul_xlondon_issue": new Int(97, 1),
        "reservation_required": new Text(98, 1),
        "capri_code": new Text(99, 3),
        "lul_93": new Text(102, 1),
        "uts_code": new Text(103, 2),
        "time_restriction": new Int(105, 1),
        "free_pass_lul": new Text(106, 1),
        "package_mkr": new Text(107, 1),
        "fare_multiplier": new Int(108, 3),
        "discount_category": new Text(111, 2)
    })
);

const TTY = new SingleRecordFile(ticketTypeRecord);

export default TTY;