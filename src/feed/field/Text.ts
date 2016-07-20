
import Field from "./Field";

export default class Text implements Field {
    protected position: number;
    protected length: number;
    protected nullable: boolean;
    protected nullChars: string[] = [" ", "*"];

    constructor(position: number, length: number, isNullable: boolean = false) {
        this.position = position;
        this.length = length;
        this.nullable = isNullable;
    }

    getValue(row: string) {
        const value = row.substr(this.position, this.length);

        if (this.isNullable() && this.getNullValues().indexOf(value) !== -1) {
            return null;
        }
        else {
            return value;
        }
    }

    protected getNullValues() {
        return this.nullChars.map( c => Array(this.length + 1).join(c));
    }

    getType() {
        return "CHAR(" + this.length + ")";
    }

    isNullable() {
        return this.nullable;
    }
}