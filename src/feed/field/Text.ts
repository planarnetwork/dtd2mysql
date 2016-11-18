
import Field from "./Field";

export default class Text extends Field {

    getValue(row: string) {
        return super.extractValue(row);
    }

    getType() {
        return "CHAR(" + this.length + ")";
    }
}