
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const location = new Record(
    "location",
    ["uic", "end_date", "start_date"],
    Map({
        "uic": new Text(2, 7),
        "end_date": new DateField(9),
        "start_date": new DateField(17),
        "quote_date": new DateField(25),
        "nlc": new Text(36, 4),
        "description": new Text(40, 16),
        "crs": new Text(56, 3),
        "resv": new Text(59, 5),
        "ers_country": new Text(64, 2),
        "ers_code": new Text(66, 3),
        "fare_group": new Text(69, 6),
        "county": new Text(75, 2),
        "pte_code": new Text(77, 2),
        "zone_no": new Text(79, 4),
        "zone_ind": new Text(83, 2),
        "region": new Text(85, 1),
        "hierarchy": new Text(86, 1),
        "cc_desc_out": new Text(87, 41),
        "cc_desc_rtn": new Text(128, 16),
        "atb_desc_out": new Text(144, 60),
        "atb_desc_rtn": new Text(204, 30),
        "special_facilities": new Text(234, 26),
        "lul_direction_ind": new Text(260, 1),
        "lul_uts_mode": new Text(261, 1),
        "lul_zone_1": new Text(262, 1),
        "lul_zone_2": new Text(263, 1),
        "lul_zone_3": new Text(264, 1),
        "lul_zone_4": new Text(265, 1),
        "lul_zone_5": new Text(266, 1),
        "lul_zone_6": new Text(267, 1),
        "lul_uts_london_stn": new Text(268, 1),
        "uts_code": new Text(269, 3),
        "uts_a_code": new Text(272, 3),
        "uts_ptr_bias": new Text(275, 1),
        "uts_offset": new Text(276, 1),
        "uts_north": new Text(277, 3),
        "uts_east": new Text(280, 3),
        "uts_south": new Text(283, 3),
        "uts_west": new Text(286, 3)
    })
);

const association = new Record(
    "location_association",
    ["uic_code", "end_date", "assoc_uic_code"],
    Map({
        "uic_code": new Text(2, 7),
        "end_date": new DateField(9),
        "assoc_uic_code": new Text(17, 7),
        "assoc_crs_code": new Text(24, 3)
    })
);

const railcard = new Record(
    "location_railcard",
    ["uic_code", "railcard_code", "end_date"],
    Map({
        "uic_code": new Text(2, 7),
        "railcard_code": new Text(9, 3),
        "end_date": new DateField(12)
    })
);

const group = new Record(
    "location_group",
    ["group_uic_code", "end_date"],
    Map({
        "group_uic_code": new Text(2, 7),
        "end_date": new DateField(9),
        "start_date": new DateField(17),
        "quote_date": new DateField(25),
        "description": new Text(33, 16),
        "ers_country": new Text(49, 2),
        "ers_code": new Text(51, 3)
    })
);

const groupMember = new Record(
    "location_group_member",
    ["group_uic_code", "end_date", "member_uic_code"],
    Map({
        "group_uic_code": new Text(2, 7),
        "end_date": new DateField(9),
        "member_uic_code": new Text(17, 7),
        "member_crs_code": new Text(24, 3)
    })
);

const synonym = new Record(
    "location_synonym",
    ["uic_code", "end_date", "start_date", "description"],
    Map({
        "uic_code": new Text(2, 7),
        "end_date": new DateField(9),
        "start_date": new DateField(17),
        "description": new Text(25, 16)
    })
);

const LOC = new MultiRecordFile(Map({
    "L": location,
    "A": association,
    "G": group,
    "M": groupMember,
    "S": synonym,
    "R": railcard
}));

export default LOC;