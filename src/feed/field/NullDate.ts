
import Field from "./Field";

export default class NullDate extends Field {

    public constructor() {
        super(0, 0, true);
    }

    getValue(row:string) {
        return null;
    }

    getType(): string {
        return "DATE";
    }

}
