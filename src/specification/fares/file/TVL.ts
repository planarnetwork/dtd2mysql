
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const ticketValidity = new Record(
    "ticket_validity",
    ["validity_code", "end_date"],
    Map({
        "validity_code": new Text(0, 2),
        "end_date": new DateField(2),
        "start_date": new DateField(10),
        "description": new Text(18, 20),
        "out_days": new Int(38, 2),
        "out_months": new Int(40, 2),
        "ret_days": new Int(42, 2),
        "ret_months": new Int(44, 2),
        "ret_after_days": new Int(46, 2),
        "ret_after_months": new Int(48, 2),
        "ret_after_day": new Text(50, 2),
        "break_out": new Text(52, 1),
        "break_in": new Text(53, 1),
        "out_description": new Text(54, 14),
        "rtn_description": new Text(68, 14)
    })
);

const TVL = new SingleRecordFile(ticketValidity);

export default TVL;
