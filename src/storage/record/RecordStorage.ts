
interface RecordStorage {
    truncate(tableName: string): Promise<any>;
    save(tableName: string, data: Object): Promise<any> | null;
    flushAll(): Promise<any>[];
}

export default RecordStorage;