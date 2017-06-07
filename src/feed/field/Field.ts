
abstract class Field {
    public readonly position: number;
    public readonly length: number;
    public readonly nullable: boolean;
    public readonly nullChars: string[] = [" ", "*"];

    constructor(position: number, length: number, isNullable: boolean = false) {
        this.position = position;
        this.length = length;
        this.nullable = isNullable;
    }

    public isNullable(): boolean {
        return this.nullable;
    }

    public getNullValues() {
        return this.nullChars.map( c => Array(this.length + 1).join(c));
    }

    abstract getValue(row: string): string | number | Date;
    abstract getType(): string;
}

export default Field;

export type FieldValue = string | number | Date;