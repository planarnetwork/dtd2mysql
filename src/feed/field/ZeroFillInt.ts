
import Int from "./Int";

export default class ZeroFillInt extends Int {

    getType() {
        return super.getType() + " zerofill";
    }

}