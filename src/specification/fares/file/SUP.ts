
import {Map} from 'immutable';
import Record from "../../../feed/record/Record";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const supplementRecord = new Record(
    "supplement",
    ["supplement_code", "end_date"],
    Map({
        "supplement_code": new Text(2, 3),
        "end_date": new DateField(5),
        "start_date": new DateField(13),
        "quote_date": new DateField(21),
        "description": new Text(29, 20),
        "short_desc": new Text(49, 12),
        "suppl_type": new Text(61, 3),
        "price": new Int(64, 5),
        "cpf_ticket_type": new Text(69, 5),
        "min_group_size": new Int(74, 1),
        "max_group_size": new Int(75, 1),
        "per_leg_or_dir": new Text(76, 1),
        "class_type": new Text(77, 1),
        "capri_code": new Text(78, 3),
        "sep_tkt_ind": new Text(81, 1),
        "resvn_type": new Text(82, 2),
        "sundry_code": new ZeroFillInt(84, 5)
    })
);

const supplementRuleRecord = new Record(
    "supplement_rule",
    ["rule_number", "end_date"],
    Map({
        "rule_number": new Int(2, 3),
        "end_date": new DateField(5),
        "start_date": new DateField(13),
        "quote_date": new DateField(21),
        "train_uid": new Text(29, 7),
        "train_uid_desc": new Text(36, 39),
        "fare_class": new Text(75, 1),
        "quota": new Text(76, 1),
        "weekend_first": new Text(77, 1),
        "silver_standard": new Text(78, 1),
        "railcard": new Text(79, 1),
        "catering_code": new Text(80, 1),
        "sleeper": new Text(81, 1),
        "accom_class": new Text(82, 1),
        "status": new Text(83, 1),
        "reservation_status": new Text(84, 3),
        "sectors": new Text(87, 3)
    })
);

const supplementRuleAppliesRecord = new Record(
    "supplement_rule_applies",
    ["rule_number", "end_date", "ie_marker", "condition_type", "ie_code"],
    Map({
        "rule_number": new Int(2, 3),
        "end_date": new DateField(5),
        "ie_marker": new Text(13, 1),
        "condition_type": new Text(14, 1),
        "ie_code": new Text(15, 3)
    })
);

const supplementRuleSupplementRecord = new Record(
    "supplement_rule_supplement",
    ["rule_number", "end_date", "supplement_code"],
    Map({
        "rule_number": new Int(2, 3),
        "end_date": new DateField(5),
        "supplement_code": new Text(13, 3),
        "om_flag": new Text(16, 1)
    })
);

const supplementOverrideRecord = new Record(
    "supplement_override",
    ["supplement_code", "end_date", "overridden_supplement"],
    Map({
        "supplement_code": new Text(2, 3),
        "end_date": new DateField(5),
        "overridden_supplement": new Text(13, 3)
    })
);


const SUP = new MultiRecordFile(Map({
    "S": supplementRecord,
    "R": supplementRuleRecord,
    "A": supplementRuleAppliesRecord,
    "M": supplementRuleSupplementRecord,
    "O": supplementOverrideRecord
}));

export default SUP;