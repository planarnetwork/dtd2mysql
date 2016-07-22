
import Text from './Text';

export default class Time extends Text {

    constructor(start: number, nullable: boolean = false) {
        super(start, 4, nullable);
    }

    getType() {
        return "TIME";
    }

    getValue(row: string) {
        const value = super.getValue(row);

        if (value === null) {
            return null;
        }

        return `${value.substr(0, 2)}:${value.substr(2, 2)}`;
    }
}