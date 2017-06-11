
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";

const record = new Record(
    "railcard",
    ["railcard_code", "end_date"],
    {
        "railcard_code": new TextField(0, 3),
        "end_date": new DateField(3),
        "start_date": new DateField(11),
        "quote_date": new DateField(19),
        "holder_type": new TextField(27, 1),
        "description": new TextField(28, 20),
        "restricted_by_issue": new TextField(48, 1),
        "restricted_by_area": new TextField(49, 1),
        "restricted_by_train": new TextField(50, 1),
        "restricted_by_date": new TextField(51, 1),
        "master_code": new TextField(52, 3),
        "display_flag": new TextField(55, 1),
        "max_passengers": new IntField(56, 3),
        "min_passengers": new IntField(59, 3),
        "max_holders": new IntField(62, 3),
        "min_holders": new IntField(65, 3),
        "max_acc_adults": new IntField(68, 3),
        "min_acc_adults": new IntField(71, 3),
        "max_adults": new IntField(74, 3),
        "min_adults": new IntField(77, 3),
        "max_children": new IntField(80, 3),
        "min_children": new IntField(83, 3),
        "price": new IntField(86, 8),
        "discount_price": new IntField(94, 8),
        "validity_period": new TextField(102, 4),
        "last_valid_date": new DateField(106, true),
        "physical_card": new TextField(114, 1),
        "capri_ticket_type": new TextField(115, 3),
        "adult_status": new TextField(118, 3),
        "child_status": new TextField(121, 3),
        "aaa_status": new TextField(124, 3)
    }
);

const RLC = new SingleRecordFile(record);

export default RLC;