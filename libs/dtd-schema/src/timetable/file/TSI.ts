import {CSVRecord, IntField, SingleRecordFile, TextField} from "@gb-transit/feed-parser";

const TSI = new SingleRecordFile(
    new CSVRecord('toc_interchange', ['crs', 'from_toc', 'to_toc'], {
        'crs': new TextField(0, 3),
        'from_toc': new TextField(1, 2),
        'to_toc': new TextField(2, 2),
        'time': new IntField(3, 2),
    })
);
export default TSI;