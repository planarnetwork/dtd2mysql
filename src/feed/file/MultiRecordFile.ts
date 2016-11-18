
import Record from "../record/Record";
import {Map} from 'immutable';
import FeedFile from "./FeedFile";

export default class MultiRecordFile implements FeedFile {
    recordTypes: Map<string, Record>;
    typeStart: number;
    typeLength: number;

    constructor(recordTypes: Map<string, Record>, typeStart: number = 1, typeLength: number = 1) {
        this.recordTypes = recordTypes;
        this.typeStart = typeStart;
        this.typeLength = typeLength;
    }

    getRecordTypes() {
        return this.recordTypes.toArray();
    }

    getRecord(line: string): Record {
        return this.recordTypes.get(line.substr(this.typeStart, this.typeLength));
    }
}