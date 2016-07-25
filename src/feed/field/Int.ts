
import Text from "./Text";

export default class Int extends Text {
    protected nullChars = [" ", "*", "9"];

    getValue(row: string) {
        const value = super.getValue(row);

        if (value === null) {
            return null;
        }

        const intValue = parseInt(value);

        if (isNaN(intValue)) {
            throw new Error(`Error parsing int: "${value}" at position ${this.position}`);
        }

        return value;
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