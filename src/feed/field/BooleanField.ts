
import Field from "./Field";

export default class BooleanField extends Field {
    private truthyChars: string[] = ["Y", "1"];
    private falseChars: string[] = ["N", "0"];

    constructor(start: number, nullable: boolean = false) {
        super(start, 1, nullable);
    }

    getType() {
        return "TINYINT(1)";
    }

    getValue(value: string | null) {
        if (value === null) {
            return null;
        }

        if (this.truthyChars.indexOf(value) >= 0) {
            return 1;
        }
        else if (this.falseChars.indexOf(value) >= 0) {
            return 0;
        }
        else {
            throw new Error(`Unable to interpret ${value} as boolean`);
        }
    }
}