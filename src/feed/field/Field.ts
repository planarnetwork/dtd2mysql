
abstract class Field {
    protected position: number;
    protected length: number;
    protected nullable: boolean;
    protected nullChars: string[] = [" ", "*"];

    constructor(position: number, length: number, isNullable: boolean = false) {
        this.position = position;
        this.length = length;
        this.nullable = isNullable;
    }

    isNullable(): boolean {
        return this.nullable;
    }

    protected getNullValues() {
        return this.nullChars.map( c => Array(this.length + 1).join(c));
    }

    extractValue(row: string): string {
        const value = row.substr(this.position, this.length);

        if (this.isNullable() && this.getNullValues().indexOf(value) !== -1) {
            return null;
        }
        else {
            return value;
        }
    }

    abstract getValue(row: string): string | number | Date;
    abstract getType(): string;
}

export default Field;