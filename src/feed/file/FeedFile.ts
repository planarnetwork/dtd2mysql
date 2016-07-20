
import Record from "../record/Record";

interface FeedFile {
    getRecordTypes(): Record[];
    getRecord(line: string): Record;
}

export default FeedFile;