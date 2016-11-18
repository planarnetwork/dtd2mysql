
import Field from "./Field";

export default class Int extends Field {
    protected nullChars = [" ", "*", "9"];

    getValue(row: string): number {
        const value = super.extractValue(row);

        if (value === null) {
            return null;
        }

        const intValue = parseInt(value);

        if (isNaN(intValue)) {
            throw new Error(`Error parsing int: "${value}" at position ${this.position}`);
        }

        return intValue;
    }

    getType() {
        return this.getIntType() + "(" + this.length + ") unsigned";
    }

    private getIntType() {
        if (this.length > 9) {
            return "BIGINT";
        }
        else if (this.length > 7) {
            return "INT";
        }
        else if (this.length > 4) {
            return "MEDIUMINT";
        }
        else if (this.length > 2) {
            return "SMALLINT";
        }
        else {
            return "TINYINT";
        }
    }

}