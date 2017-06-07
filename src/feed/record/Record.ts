///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>

import Field from "../field/Field";

export default class Record {

    constructor(public readonly name: string,
                public readonly key: string[],
                public readonly fields: Immutable.Map<string, Field>,
                public readonly indexes: string[] = []) {
    }

    public extractRecord(line: string) {
        return [null].concat(this.fields.toArray().map(f => f.getValue(this.extractValue(f, line))));
    }

    private extractValue(field: Field, row: string): string | null {
        const value = row.substr(field.position, field.length);

        if (field.isNullable() && field.getNullValues().indexOf(value) !== -1) {
            return null;
        }
        else {
            return value;
        }
    }


}