
import Record from "../record/Record";
import FeedFile from "./FeedFile";

export default class SingleRecordFile implements FeedFile {

    recordType: Record;

    constructor(recordTypes: Record) {
        this.recordType = recordTypes;
    }

    getRecordTypes() {
        return [this.recordType];
    }

    getRecord(line: string) {
        return this.recordType;
    }
}