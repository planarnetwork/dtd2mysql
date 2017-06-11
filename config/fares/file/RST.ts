
import Record from "../../../feed/record/Record";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import DateField from "../../../feed/field/DateField";
import NullDate from "../../../feed/field/NullDate";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";
import Time from "../../../feed/field/Time";
import BooleanField from "../../../feed/field/BooleanField";

const dates = new Record(
    "restriction_date",
    ["cf_mkr"],
    {
        "cf_mkr": new TextField(3, 1),
        "start_date": new DateField(4),
        "end_date": new DateField(12),
        "atb_desc": new TextField(20, 5),
    }
);

const header = new Record(
    "restriction_header",
    ["cf_mkr", "restriction_code"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "description": new TextField(6, 30),
        "desc_out": new TextField(36, 50),
        "desc_ret": new TextField(86, 50),
        "type_out": new TextField(136, 1),
        "type_ret": new TextField(137, 1),
        "change_ind": new TextField(138, 1),
    }
);

const headerDate = new Record(
    "restriction_header_date",
    ["cf_mkr", "restriction_code", "date_from", "date_to"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "date_from": new TextField(6, 4),
        "date_to": new TextField(10, 4),
        "start_date": new NullDate(),
        "end_date": new NullDate(),
        "monday": new BooleanField(14),
        "tuesday": new BooleanField(15),
        "wednesday": new BooleanField(16),
        "thursday": new BooleanField(17),
        "friday": new BooleanField(18),
        "saturday": new BooleanField(19),
        "sunday": new BooleanField(20)
    }
);

const headerLocation = new Record(
    "restriction_header_route_location",
    ["cf_mkr", "restriction_code", "location_crs_code"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "location_crs_code": new TextField(6, 3),
    }
);

const headerChanges = new Record(
    "restriction_header_allowed_change",
    ["cf_mkr", "restriction_code", "allowed_change"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "allowed_change": new TextField(6, 3),
    }
);

const headerAdditional = new Record(
    "restriction_header_additional_restriction",
    ["cf_mkr", "restriction_code", "additional_restriction", "origin", "destination"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "additional_restriction": new TextField(6, 2),
        "origin": new TextField(9, 3),
        "destination": new TextField(12, 3)
    }
);

const time = new Record(
    "restriction_time",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "sequence_no": new TextField(6, 4),
        "out_ret": new TextField(10, 1),
        "time_from": new Time(11),
        "time_to": new Time(15),
        "arr_dep_via": new TextField(19, 1),
        "location": new TextField(20, 3, true),
        "rstr_type": new TextField(23, 1),
        "train_type": new TextField(24, 1),
        "min_fare_flag": new TextField(25, 1)
    }
);

const timeDateBand = new Record(
    "restriction_time_date",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "date_from", "date_to"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "sequence_no": new TextField(6, 4),
        "out_ret": new TextField(10, 1),
        "date_from": new TextField(11, 4),
        "date_to": new TextField(15, 4),
        "start_date": new NullDate(),
        "end_date": new NullDate(),
        "monday": new BooleanField(19),
        "tuesday": new BooleanField(20),
        "wednesday": new BooleanField(21),
        "thursday": new BooleanField(22),
        "friday": new BooleanField(23),
        "saturday": new BooleanField(24),
        "sunday": new BooleanField(25),
    }
);

const timeToc = new Record(
    "restriction_time_toc",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "toc_code"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "sequence_no": new TextField(6, 4),
        "out_ret": new TextField(10, 1),
        "toc_code": new TextField(11, 2)
    }
);

const timePriviledge = new Record(
    "restriction_time_priviledge",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "barred_class", "barred_tickets", "barred_seasons", "barred_first", "from_location", "to_location"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "sequence_no": new TextField(6, 4),
        "out_ret": new TextField(10, 1),
        "barred_class": new TextField(11, 1),
        "barred_tickets": new TextField(12, 1),
        "barred_seasons": new TextField(13, 1),
        "barred_first": new TextField(14, 1),
        "from_location": new TextField(15, 3, true),
        "to_location": new TextField(18, 3, true)
    }
);

const timePriviledgeException = new Record(
    "restriction_time_priviledge_exception",
    ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "pass_exception"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "sequence_no": new TextField(6, 4),
        "out_ret": new TextField(10, 1),
        "pass_exception": new TextField(11, 1)
    }
);

const train = new Record(
    "restriction_train",
    ["cf_mkr", "restriction_code", "train_no", "out_ret"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "train_no": new TextField(6, 6),
        "out_ret": new TextField(12, 1),
        "quota_ind": new TextField(13, 1),
        "sleeper_ind": new TextField(14, 1)
    }
);


const trainDate = new Record(
    "restriction_train_date",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "date_from", "date_to"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "train_no": new TextField(6, 6),
        "out_ret": new TextField(12, 1),
        "date_from": new TextField(13, 4),
        "date_to": new TextField(17, 4),
        "start_date": new NullDate(),
        "end_date": new NullDate(),
        "monday": new BooleanField(21),
        "tuesday": new BooleanField(22),
        "wednesday": new BooleanField(23),
        "thursday": new BooleanField(24),
        "friday": new BooleanField(25),
        "saturday": new BooleanField(26),
        "sunday": new BooleanField(27)
    }
);

const trainQuota = new Record(
    "restriction_train_quota",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "location", "quota_ind", "arr_dep"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "train_no": new TextField(6, 6),
        "out_ret": new TextField(12, 1),
        "location": new TextField(13, 3),
        "quota_ind": new TextField(16, 1, null),
        "arr_dep": new TextField(17, 1)
    }
);

const trainPriviledge = new Record(
    "restriction_train_priviledge",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "barred_class", "barred_tickets", "barred_seasons", "barred_first", "from_location", "to_location"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "train_no": new TextField(6, 6),
        "out_ret": new TextField(12, 1),
        "barred_class": new TextField(13, 1),
        "barred_tickets": new TextField(14, 1),
        "barred_seasons": new TextField(15, 1),
        "barred_first": new TextField(16, 1),
        "from_location": new TextField(17, 3, true),
        "to_location": new TextField(20, 3, true)
    }
);

const trainPriviledgeException = new Record(
    "restriction_train_priviledge_exception",
    ["cf_mkr", "restriction_code", "train_no", "out_ret", "pass_exception"],
    {
        "cf_mkr": new TextField(3, 1),
        "restriction_code": new TextField(4, 2),
        "train_no": new TextField(6, 6),
        "out_ret": new TextField(12, 1),
        "pass_exception": new TextField(13, 1)
    }
);

const railcard = new Record(
    "restriction_railcard",
    ["cf_mkr", "railcard_code", "sequence_no"],
    {
        "cf_mkr": new TextField(3, 1),
        "railcard_code": new TextField(4, 3),
        "sequence_no": new TextField(7, 4),
        "ticket_code": new TextField(11, 3, true),
        "route_code": new ZeroFillIntField(14, 5, true),
        "location": new TextField(19, 3, true),
        "restriction_code": new TextField(22, 2, true),
        "total_ban": new TextField(24, 1, true)
    }
);

const exceptionCode = new Record(
    "restriction_exception",
    ["cf_mkr", "exception_code"],
    {
        "cf_mkr": new TextField(3, 1),
        "exception_code": new TextField(4, 1),
        "description": new TextField(5, 50)
    }
);

const ticketCalendar = new Record(
    "restriction_ticket_calendar",
    ["cf_mkr", "ticket_code", "cal_type", "route_code", "country_code", "date_from", "date_to"],
    {
        "cf_mkr": new TextField(3, 1),
        "ticket_code": new TextField(4, 3),
        "cal_type": new TextField(7, 1),
        "route_code": new ZeroFillIntField(8, 5, true),
        "country_code": new TextField(13, 1),
        "date_from": new TextField(14, 4),
        "date_to": new TextField(18, 4),
        "start_date": new NullDate(),
        "end_date": new NullDate(),
        "monday": new BooleanField(22),
        "tuesday": new BooleanField(23),
        "wednesday": new BooleanField(24),
        "thursday": new BooleanField(25),
        "friday": new BooleanField(26),
        "saturday": new BooleanField(27),
        "sunday": new BooleanField(28),
    }
);


const RST = new MultiRecordFile({
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
}, 1, 2);

export default RST;