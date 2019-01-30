
import {FeedFile} from "./FeedFile";
import {Record} from "../record/Record";

export class XmlFile implements FeedFile {

    constructor(
        private readonly recordType: Record
    ) {}

    /**
     * Return the record type wrapped in an array
     */
    public get recordTypes(): Record[] {
        return [this.recordType];
    }

    /**
     * Return the record type
     */
    public getRecord(data: any): Record | null {
        return this.recordType;
    }
}
