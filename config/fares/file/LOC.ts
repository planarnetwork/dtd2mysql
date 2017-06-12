
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";
import {BooleanField} from "../../../src/feed/field/BooleanField";


const location = new FixedWidthRecord(
  "location",
  ["uic", "end_date", "start_date"],
  {
    "uic": new TextField(2, 7),
    "end_date": new DateField(9),
    "start_date": new DateField(17),
    "quote_date": new DateField(25),
    "area_admin_code": new TextField(34, 2),
    "nlc": new TextField(36, 4, true),
    "description": new TextField(40, 16),
    "crs": new TextField(56, 3, true),
    "resv": new TextField(59, 5),
    "ers_country": new TextField(64, 2, true),
    "ers_code": new TextField(66, 3, true),
    "fare_group": new TextField(69, 6, true),
    "county": new TextField(75, 2, true),
    "pte_code": new TextField(77, 2, true),
    "zone_no": new TextField(79, 4, true),
    "zone_ind": new TextField(83, 2, true),
    "region": new TextField(85, 1, true),
    "hierarchy": new TextField(86, 1, true),
    "cc_desc_out": new TextField(87, 41, true),
    "cc_desc_rtn": new TextField(128, 16, true),
    "atb_desc_out": new TextField(144, 60, true),
    "atb_desc_rtn": new TextField(204, 30, true),
    "special_facilities": new TextField(234, 26, true),
    "lul_direction_ind": new TextField(260, 1, true),
    "lul_uts_mode": new TextField(261, 1, true),
    "lul_zone_1": new BooleanField(262, true),
    "lul_zone_2": new BooleanField(263, true),
    "lul_zone_3": new BooleanField(264, true),
    "lul_zone_4": new BooleanField(265, true),
    "lul_zone_5": new BooleanField(266, true),
    "lul_zone_6": new BooleanField(267, true),
    "lul_uts_london_stn": new TextField(268, 1, true),
    "uts_code": new TextField(269, 3, true),
    "uts_a_code": new TextField(272, 3, true),
    "uts_ptr_bias": new TextField(275, 1, true),
    "uts_offset": new TextField(276, 1, true),
    "uts_north": new TextField(277, 3, true),
    "uts_east": new TextField(280, 3, true),
    "uts_south": new TextField(283, 3, true),
    "uts_west": new TextField(286, 3, true)
  }
);

const association = new FixedWidthRecord(
  "location_association",
  ["uic_code", "end_date", "assoc_uic_code"],
  {
    "uic_code": new TextField(2, 7),
    "end_date": new DateField(9),
    "assoc_uic_code": new TextField(17, 7),
    "assoc_crs_code": new TextField(24, 3)
  }
);

const railcard = new FixedWidthRecord(
  "location_railcard",
  ["uic_code", "railcard_code", "end_date"],
  {
    "uic_code": new TextField(2, 7),
    "railcard_code": new TextField(9, 3),
    "end_date": new DateField(12)
  }
);

const group = new FixedWidthRecord(
  "location_group",
  ["group_uic_code", "end_date"],
  {
    "group_uic_code": new TextField(2, 7),
    "end_date": new DateField(9),
    "start_date": new DateField(17),
    "quote_date": new DateField(25),
    "description": new TextField(33, 16),
    "ers_country": new TextField(49, 2, true),
    "ers_code": new TextField(51, 3, true)
  }
);

const groupMember = new FixedWidthRecord(
  "location_group_member",
  ["group_uic_code", "end_date", "member_uic_code"],
  {
    "group_uic_code": new TextField(2, 7),
    "end_date": new DateField(9),
    "member_uic_code": new TextField(17, 7),
    "member_crs_code": new TextField(24, 3)
  }
);

const synonym = new FixedWidthRecord(
  "location_synonym",
  ["uic_code", "end_date", "start_date", "description"],
  {
    "uic_code": new TextField(2, 7),
    "end_date": new DateField(9),
    "start_date": new DateField(17),
    "description": new TextField(25, 16)
  }
);

const LOC = new MultiRecordFile({
  "L": location,
  "A": association,
  "G": group,
  "M": groupMember,
  "S": synonym,
  "R": railcard
});

export default LOC;