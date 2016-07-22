
import {Map} from "immutable";
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const record = new Record(
    "toc_specific_ticket",
    ["ticket_code", "restriction_code", "restriction_flag", "direction", "toc_id", "toc_type", "end_date"],
    Map({
        "ticket_code": new Text(0, 3),
        "restriction_code": new Text(3, 2),
        "restriction_flag": new Text(5, 1),
        "direction": new Text(6, 1),
        "toc_id": new Text(7, 2),
        "toc_type": new Text(9, 1),
        "end_date": new DateField(10),
        "start_date": new DateField(18),
        "sleeper_mkr": new Text(26, 1),
        "inc_exc_stock": new Text(27, 1),
        "stock_list": new Text(28, 40)
    })
);

const TSP = new SingleRecordFile(record);

export default TSP;