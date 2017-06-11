
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const record = new Record(
    "toc_specific_ticket",
    ["ticket_code", "restriction_code", "restriction_flag", "direction", "toc_id", "toc_type", "end_date"],
    {
        "ticket_code": new TextField(0, 3),
        "restriction_code": new TextField(3, 2),
        "restriction_flag": new TextField(5, 1),
        "direction": new TextField(6, 1),
        "toc_id": new TextField(7, 2),
        "toc_type": new TextField(9, 1),
        "end_date": new DateField(10),
        "start_date": new DateField(18),
        "sleeper_mkr": new TextField(26, 1),
        "inc_exc_stock": new TextField(27, 1),
        "stock_list": new TextField(28, 40)
    }
);

const TSP = new SingleRecordFile(record);

export default TSP;