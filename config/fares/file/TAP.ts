
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import Time from "../../../feed/field/Time";

const record = new Record(
    "advance_ticket",
    ["ticket_code", "restriction_code", "restriction_flag", "toc_id", "end_date"],
    {
        "ticket_code": new TextField(0, 3),
        "restriction_code": new TextField(3, 2),
        "restriction_flag": new TextField(5, 1),
        "toc_id": new TextField(6, 2),
        "end_date": new DateField(8),
        "start_date": new DateField(16),
        "check_type": new TextField(24, 1),
        "ap_data": new TextField(25, 8),
        "booking_time": new Time(33)
    }
);

const TAP = new SingleRecordFile(record);

export default TAP;