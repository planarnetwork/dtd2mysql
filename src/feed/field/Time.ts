
import Field from "./Field";

export default class Time extends Field {

    constructor(start: number, nullable: boolean = false) {
        super(start, 4, nullable);
    }

    getType() {
        return "TIME";
    }

    getValue(value: string | null) {
        if (value === null) {
            return null;
        }

        return `${value.substr(0, 2)}:${value.substr(2, 2)}`;
    }
}