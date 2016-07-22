
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const record = new Record(
    "route",
    ["route_code", "end_date"],
    Map({
        "route_code": new Text(2, 5),
        "end_date": new DateField(7),
        "start_date": new DateField(15),
        "quote_date": new DateField(23),
        "description": new Text(31, 16),
        "atb_desc_1": new Text(47, 35),
        "atb_desc_2": new Text(82, 35),
        "atb_desc_3": new Text(117, 35),
        "atb_desc_4": new Text(152, 35),
        "cc_desc": new Text(187, 16),
        "aaa_desc": new Text(203, 41),
        "uts_mode": new Text(244, 1),
        "uts_zone_1": new Text(245, 1),
        "uts_zone_2": new Text(246, 1),
        "uts_zone_3": new Text(247, 1),
        "uts_zone_4": new Text(248, 1),
        "uts_zone_5": new Text(249, 1),
        "uts_zone_6": new Text(250, 1),
        "uts_north": new Text(251, 3),
        "uts_east": new Text(254, 3),
        "uts_south": new Text(257, 3),
        "uts_west": new Text(260, 3)
    })
);

const RTE = new SingleRecordFile(record);

export default RTE;