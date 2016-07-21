///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>

import Field from "../field/Field";

export default class Record {
    name: string;
    key: string[];
    indexes: string[];
    fields: Immutable.Map<string, Field>;

    constructor(name: string, key: string[], fields: Immutable.Map<string, Field>, indexes: string[] = []) {
        this.name = name;
        this.key = key;
        this.indexes = indexes;
        this.fields = fields;
    }

    extractRecord(line: string) {
        return [null].concat(this.fields.toArray().map(f => f.getValue(line)));
        let obj = {};

        for (const fieldName in this.fields.toObject()) {
            obj[fieldName] = this.fields.get(fieldName).getValue(line);
        }

        return obj;
    }

}