
import Text from './Text';

export default class DateField extends Text {

    constructor(start: number) {
        super(start, 8);
    }

    getType() {
        return "DATE";
    }

}