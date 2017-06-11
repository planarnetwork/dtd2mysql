
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const record = new Record(
    "route",
    ["route_code", "end_date"],
    {
        "route_code": new TextField(2, 5),
        "end_date": new DateField(7),
        "start_date": new DateField(15),
        "quote_date": new DateField(23),
        "description": new TextField(31, 16),
        "atb_desc_1": new TextField(47, 35),
        "atb_desc_2": new TextField(82, 35),
        "atb_desc_3": new TextField(117, 35),
        "atb_desc_4": new TextField(152, 35),
        "cc_desc": new TextField(187, 16),
        "aaa_desc": new TextField(203, 41),
        "uts_mode": new TextField(244, 1),
        "uts_zone_1": new TextField(245, 1),
        "uts_zone_2": new TextField(246, 1),
        "uts_zone_3": new TextField(247, 1),
        "uts_zone_4": new TextField(248, 1),
        "uts_zone_5": new TextField(249, 1),
        "uts_zone_6": new TextField(250, 1),
        "uts_north": new TextField(251, 3),
        "uts_east": new TextField(254, 3),
        "uts_south": new TextField(257, 3),
        "uts_west": new TextField(260, 3)
    }
);

const location = new Record(
    "route_location",
    ["route_code", "end_date", "admin_area_code", "nlc_code"],
    {
        "route_code": new TextField(2, 5),
        "end_date": new DateField(7),
        "admin_area_code": new TextField(15, 3),
        "nlc_code": new TextField(18, 4),
        "crs_code": new TextField(22, 3),
        "incl_excl": new TextField(25, 1)
    }
);

const RTE = new MultiRecordFile({
    "R": record,
    "L": location
});

export default RTE;