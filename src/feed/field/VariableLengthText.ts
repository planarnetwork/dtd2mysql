
import Text from "./Text";

export default class VariableLengthText extends Text {

    getType() {
        return "VARCHAR(" + this.length + ")";
    }

}