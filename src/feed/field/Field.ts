
interface Field {
    getValue(row: string): string | number | Date;
    getType(): string;
    isNullable(): boolean;
}

export default Field;