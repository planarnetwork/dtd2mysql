
import Record from "../../../feed/record/Record";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const rover = new Record(
    "rover",
    ["rover_code", "end_date"],
    {
        "rover_code": new TextField(1, 3),
        "end_date": new DateField(4),
        "start_date": new DateField(12),
        "quote_date": new DateField(20),
        "description": new TextField(28, 30),
        "ticket_desc": new TextField(58, 15),
        "capri_ticket_code": new TextField(73, 3),
        "rover_accounting_code": new TextField(76, 4),
        "days_travel": new IntField(80, 3),
        "months_valid": new IntField(83, 2),
        "days_valid": new IntField(85, 2)
    }
);

const price = new Record(
    "rover_price",
    ["rover_code", "end_date", "railcard_code", "rover_class"],
    {
        "rover_code": new TextField(1, 3),
        "end_date": new DateField(4),
        "railcard_code": new TextField(12, 3),
        "rover_class": new IntField(15, 1),
        "adult_fare": new IntField(16, 8),
        "child_fare": new IntField(24, 8),
        "restriction_code": new TextField(32, 2, true)
    }
);

const TRR = new MultiRecordFile({
    "R": rover,
    "P": price
}, 0);

export default TRR;