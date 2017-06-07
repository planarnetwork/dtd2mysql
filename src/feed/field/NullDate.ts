
import Field from "./Field";

export default class NullDate extends Field {

    public constructor() {
        super(0, 0, true);
    }

    getValue(value: string | null) {
        return null;
    }

    getType(): string {
        return "DATE";
    }

}
