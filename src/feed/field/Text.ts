
import Field from "./Field";

export default class Text extends Field {

    getValue(value: string | null) {
        return value;
    }

    getType() {
        return "CHAR(" + this.length + ")";
    }

}