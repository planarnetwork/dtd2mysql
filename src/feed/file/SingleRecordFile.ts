import {FeedFile} from "./FeedFile";
import {Record} from "../record/Record";

export class SingleRecordFile implements FeedFile {

    constructor(
        private readonly recordType: Record,
        private readonly filter: RecordFilter | null = null
    ) {
    }

    /**
     * Return the record type wrapped in an array
     */
    public get recordTypes(): Record[] {
        return [this.recordType];
    }

    /**
     * Return the record type
     */
    public getRecord(line: string): Record | null {
        if (line === "" || line.charAt(0) === "/") {
            return null;
        }

        if (this.filter === null || this.filter(line)) {
            return this.recordType;
        }

        return null;
    }
}

export type RecordFilter = (line: string) => boolean;
