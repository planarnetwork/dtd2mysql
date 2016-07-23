
import {Map} from 'immutable';
import Record from "../../../feed/record/Record";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";
import Time from "../../../feed/field/Time";

const dates = new Record(
    "restriction_date",
    ["cf_mkr"],
    Map({
        "cf_mkr": new Text(3, 1),
        "start_date": new DateField(4),
        "end_date": new DateField(12),
        "atb_desc": new Text(20, 5),
    })
);

const header = new Record(
    "restriction_header",
    ["cf_mkr", "restriction_code"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "description": new Text(6, 30),
        "desc_out": new Text(36, 50),
        "desc_ret": new Text(86, 50),
        "type_out": new Text(136, 1),
        "type_ret": new Text(137, 1),
        "change_ind": new Text(138, 1),
    })
);

const headerDate = new Record(
    "restriction_header_date",
    ["cf_mkr", "restriction_code", "date_from", "date_to"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "date_from": new Text(6, 4),
        "date_to": new Text(10, 4),
        "days": new Text(14, 7)
    })
);

const headerLocation = new Record(
    "restriction_header_route_location",
    ["cf_mkr", "restriction_code", "location_crs_code"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "location_crs_code": new Text(6, 3),
    })
);

const headerChanges = new Record(
    "restriction_header_allowed_change",
    ["cf_mkr", "restriction_code", "allowed_change"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "allowed_change": new Text(6, 3),
    })
);

const headerAdditional = new Record(
    "restriction_header_additional_restriction",
    ["cf_mkr", "restriction_code", "additional_restriction", "origin", "destination"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "additional_restriction": new Text(6, 2),
        "origin": new Text(9, 3),
        "destination": new Text(12, 3)
    })
);

const time = new Record(
    "restriction_time",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "sequence_no": new Text(6, 4),
        "out_ret": new Text(10, 1),
        "time_from": new Time(11),
        "time_to": new Time(15),
        "arr_dep_via": new Text(19, 1),
        "location": new Text(20, 3),
        "rstr_type": new Text(23, 1),
        "train_type": new Text(24, 1),
        "min_fare_flag": new Text(25, 1)
    })
);

const timeDateBand = new Record(
    "restriction_time_date",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "date_from", "date_to"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "sequence_no": new Text(6, 4),
        "out_ret": new Text(10, 1),
        "date_from": new Text(11, 4),
        "date_to": new Text(15, 4),
        "days": new Text(19, 7)
    })
);

const timeToc = new Record(
    "restriction_time_toc",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "toc_code"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "sequence_no": new Text(6, 4),
        "out_ret": new Text(10, 1),
        "toc_code": new Text(11, 2)
    })
);

const timePriviledge = new Record(
    "restriction_time_priviledge",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "barred_class", "barred_tickets", "barred_seasons", "barred_first", "from_location", "to_location"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "sequence_no": new Text(6, 4),
        "out_ret": new Text(10, 1),
        "barred_class": new Text(11, 1),
        "barred_tickets": new Text(12, 1),
        "barred_seasons": new Text(13, 1),
        "barred_first": new Text(14, 1),
        "from_location": new Text(15, 3, true),
        "to_location": new Text(18, 3, true)
    })
);

const timePriviledgeException = new Record(
    "restriction_time_priviledge_exception",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "pass_exception"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "sequence_no": new Text(6, 4),
        "out_ret": new Text(10, 1),
        "pass_exception": new Text(11, 1)
    })
);

const train = new Record(
    "restriction_train",
    ["cf_mkr", "restriction_code", "train_no", "out_ret"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "train_no": new Text(6, 6),
        "out_ret": new Text(12, 1),
        "quota_ind": new Text(13, 1),
        "sleeper_ind": new Text(14, 1)
    })
);


const trainDate = new Record(
    "restriction_train_date",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "date_from", "date_to"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "train_no": new Text(6, 6),
        "out_ret": new Text(12, 1),
        "date_from": new Text(13, 4),
        "date_to": new Text(17, 4),
        "days": new Text(21, 7)
    })
);

const trainQuota = new Record(
    "restriction_train_quota",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "location", "quota_ind", "arr_dep"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "train_no": new Text(6, 6),
        "out_ret": new Text(12, 1),
        "location": new Text(13, 3),
        "quota_ind": new Text(16, 1),
        "arr_dep": new Text(17, 1)
    })
);

const trainPriviledge = new Record(
    "restriction_train_priviledge",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "barred_class", "barred_tickets", "barred_seasons", "barred_first", "from_location", "to_location"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "train_no": new Text(6, 6),
        "out_ret": new Text(12, 1),
        "barred_class": new Text(13, 1),
        "barred_tickets": new Text(14, 1),
        "barred_seasons": new Text(15, 1),
        "barred_first": new Text(16, 1),
        "from_location": new Text(17, 3, true),
        "to_location": new Text(20, 3, true)
    })
);

const trainPriviledgeException = new Record(
    "restriction_train_priviledge_exception",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "pass_exception"],
    Map({
        "cf_mkr": new Text(3, 1),
        "restriction_code": new Text(4, 2),
        "train_no": new Text(6, 6),
        "out_ret": new Text(12, 1),
        "pass_exception": new Text(13, 1)
    })
);

const railcard = new Record(
    "restriction_railcard",
    ["cf_mkr", "railcard_code", "sequence_no"],
    Map({
        "cf_mkr": new Text(3, 1),
        "railcard_code": new Text(4, 3),
        "sequence_no": new Text(7, 4),
        "ticket_code": new Text(11, 3),
        "route_code": new ZeroFillInt(14, 5, true),
        "location": new Text(19, 3),
        "restriction_code": new Text(22, 2, true),
        "total_ban": new Text(24, 1, true)
    })
);

const exceptionCode = new Record(
    "restriction_exception",
    ["cf_mkr", "exception_code"],
    Map({
        "cf_mkr": new Text(3, 1),
        "exception_code": new Text(4, 1),
        "description": new Text(5, 50)
    })
);

const ticketCalendar = new Record(
    "restriction_ticket_calendar",
    ["cf_mkr", "ticket_code", "cal_type", "route_code", "country_code", "date_from", "date_to"],
    Map({
        "cf_mkr": new Text(3, 1),
        "ticket_code": new Text(4, 3),
        "cal_type": new Text(7, 1),
        "route_code": new ZeroFillInt(8, 5, true),
        "country_code": new Text(13, 1),
        "date_from": new Text(14, 4),
        "date_to": new Text(18, 4),
        "days": new Text(22, 7)
    })
);


const RST = new MultiRecordFile(Map({
    "RD": dates,
    "RH": header,
    "HD": headerDate,
    "HL": headerLocation,
    "HC": headerChanges,
    "HA": headerAdditional,
    "TR": time,
    "TD": timeDateBand,
    "TT": timeToc,
    "TP": timePriviledge,
    "TE": timePriviledgeException,
    "SR": train,
    "SD": trainDate,
    "SQ": trainQuota,
    "SP": trainPriviledge,
    "SE": trainPriviledgeException,
    "RR": railcard,
    "EC": exceptionCode,
    "CA": ticketCalendar
}), 1, 2);

export default RST;