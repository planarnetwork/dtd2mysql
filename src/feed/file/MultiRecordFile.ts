
import Record from "../record/Record";
import {Map} from 'immutable';
import FeedFile from "./FeedFile";

export default class MultiRecordFile implements FeedFile {
    recordTypes: Map<string, Record>;
    constructor(recordTypes: Map<string, Record>) {
        this.recordTypes = recordTypes;
    }

    getRecordTypes() {
        return this.recordTypes.toArray();
    }

    getRecord(line: string): Record {
        return this.recordTypes.get(line.charAt(1));
    }
}