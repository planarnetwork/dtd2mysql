import {TextField} from "../../../src/feed/field/TextField";
import {IntField} from "../../../src/feed/field/IntField";
import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";

const TSI = new SingleRecordFile(
    new CSVRecord('toc_interchange', ['crs', 'from_toc', 'to_toc'], {
        'crs': new TextField(0, 3),
        'from_toc': new TextField(1, 2),
        'to_toc': new TextField(2, 2),
        'time': new IntField(3, 2),
    })
);
export default TSI;