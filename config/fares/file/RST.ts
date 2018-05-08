
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {ZeroFillIntField} from "../../../src/feed/field/IntField";
import {BooleanField} from "../../../src/feed/field/BooleanField";
import {TimeField} from "../../../src/feed/field/TimeField";
import {DateField, NullDateField} from "../../../src/feed/field/DateField";
import {RecordAction} from "../../../src/feed/record/Record";

const dates = new FixedWidthRecord(
  "restriction_date",
  ["cf_mkr"],
  {
    "cf_mkr": new TextField(3, 1),
    "start_date": new DateField(4),
    "end_date": new DateField(12),
    "atb_desc": new TextField(20, 5, true),
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const header = new FixedWidthRecord(
  "restriction_header",
  ["cf_mkr", "restriction_code"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "description": new TextField(6, 30, true),
    "desc_out": new TextField(36, 50, true),
    "desc_ret": new TextField(86, 50, true),
    "type_out": new TextField(136, 1),
    "type_ret": new TextField(137, 1),
    "change_ind": new BooleanField(138),
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const headerDate = new FixedWidthRecord(
  "restriction_header_date",
  ["cf_mkr", "restriction_code", "date_from", "date_to"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "date_from": new TextField(6, 4),
    "date_to": new TextField(10, 4),
    "monday": new BooleanField(14),
    "tuesday": new BooleanField(15),
    "wednesday": new BooleanField(16),
    "thursday": new BooleanField(17),
    "friday": new BooleanField(18),
    "saturday": new BooleanField(19),
    "sunday": new BooleanField(20),
    "start_date": new NullDateField(),
    "end_date": new NullDateField()
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const time = new FixedWidthRecord(
  "restriction_time",
  ["cf_mkr", "restriction_code", "sequence_no", "out_ret"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "sequence_no": new TextField(6, 4),
    "out_ret": new TextField(10, 1),
    "time_from": new TimeField(11, 4, false, []),
    "time_to": new TimeField(15, 4, false, []),
    "arr_dep_via": new TextField(19, 1),
    "location": new TextField(20, 3, true),
    "rstr_type": new TextField(23, 1),
    "train_type": new TextField(24, 1),
    "min_fare_flag": new BooleanField(25)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const timeDateBand = new FixedWidthRecord(
  "restriction_time_date",
  ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "date_from", "date_to"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "sequence_no": new TextField(6, 4),
    "out_ret": new TextField(10, 1),
    "date_from": new TextField(11, 4),
    "date_to": new TextField(15, 4),
    "monday": new BooleanField(19),
    "tuesday": new BooleanField(20),
    "wednesday": new BooleanField(21),
    "thursday": new BooleanField(22),
    "friday": new BooleanField(23),
    "saturday": new BooleanField(24),
    "sunday": new BooleanField(25),
    "start_date": new NullDateField(),
    "end_date": new NullDateField()
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const timeToc = new FixedWidthRecord(
  "restriction_time_toc",
  ["cf_mkr", "restriction_code", "sequence_no", "out_ret", "toc_code"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "sequence_no": new TextField(6, 4),
    "out_ret": new TextField(10, 1),
    "toc_code": new TextField(11, 2)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const train = new FixedWidthRecord(
  "restriction_train",
  ["cf_mkr", "restriction_code", "train_no", "out_ret"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "train_no": new TextField(6, 6),
    "out_ret": new TextField(12, 1),
    "quota_ind": new TextField(13, 1),
    "sleeper_ind": new TextField(14, 1)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const trainDate = new FixedWidthRecord(
  "restriction_train_date",
  ["cf_mkr", "restriction_code", "train_no", "out_ret", "date_from", "date_to"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "train_no": new TextField(6, 6),
    "out_ret": new TextField(12, 1),
    "date_from": new TextField(13, 4),
    "date_to": new TextField(17, 4),
    "monday": new BooleanField(21),
    "tuesday": new BooleanField(22),
    "wednesday": new BooleanField(23),
    "thursday": new BooleanField(24),
    "friday": new BooleanField(25),
    "saturday": new BooleanField(26),
    "sunday": new BooleanField(27),
    "start_date": new NullDateField(),
    "end_date": new NullDateField()
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const trainQuota = new FixedWidthRecord(
  "restriction_train_quota",
  ["cf_mkr", "restriction_code", "train_no", "out_ret", "location", "quota_ind", "arr_dep"],
  {
    "cf_mkr": new TextField(3, 1),
    "restriction_code": new TextField(4, 2),
    "train_no": new TextField(6, 6),
    "out_ret": new TextField(12, 1),
    "location": new TextField(13, 3),
    "quota_ind": new TextField(16, 1, true),
    "arr_dep": new TextField(17, 1)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const railcard = new FixedWidthRecord(
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
    "total_ban": new BooleanField(24, false, ["Y"], [" "], [])
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const exceptionCode = new FixedWidthRecord(
  "restriction_exception",
  ["cf_mkr", "exception_code"],
  {
    "cf_mkr": new TextField(3, 1),
    "exception_code": new TextField(4, 1),
    "description": new TextField(5, 50)
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);

const ticketCalendar = new FixedWidthRecord(
  "restriction_ticket_calendar",
  ["cf_mkr", "ticket_code", "cal_type", "route_code", "country_code", "date_from", "date_to"],
  {
    "cf_mkr": new TextField(3, 1),
    "ticket_code": new TextField(4, 3),
    "cal_type": new TextField(7, 1),
    "route_code": new ZeroFillIntField(8, 5, true),
    "country_code": new TextField(13, 1, false, []),
    "date_from": new TextField(14, 4),
    "date_to": new TextField(18, 4),
    "monday": new BooleanField(22),
    "tuesday": new BooleanField(23),
    "wednesday": new BooleanField(24),
    "thursday": new BooleanField(25),
    "friday": new BooleanField(26),
    "saturday": new BooleanField(27),
    "sunday": new BooleanField(28),
    "start_date": new NullDateField(),
    "end_date": new NullDateField()
  },
  [],
  {
    "I": RecordAction.Insert,
    "A": RecordAction.Update,
    "D": RecordAction.Delete,
    "R": RecordAction.Insert
  }
);


const RST = new MultiRecordFile({
  "RD": dates,
  "RH": header,
  "HD": headerDate,
  "TR": time,
  "TD": timeDateBand,
  "TT": timeToc,
  "SR": train,
  "SD": trainDate,
  "SQ": trainQuota,
  "RR": railcard,
  "EC": exceptionCode,
  "CA": ticketCalendar
}, 1, 2);

export default RST;