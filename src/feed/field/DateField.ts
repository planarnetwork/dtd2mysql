
import Field from "./Field";

export default class DateField extends Field {
    protected nullChars: string[] = [" ", "*", "0"];

    constructor(start: number, nullable: boolean = false) {
        super(start, 8, nullable);
    }

    getType() {
        return "DATE";
    }

    getValue(row: string) {
        const value = super.extractValue(row);

        if (value === null) {
            return null;
        }

        return `${value.substr(4, 4)}-${value.substr(2, 2)}-${value.substr(0, 2)}`;
    }
}