
interface RecordStorage {
    truncate(tableName: string): Promise<any> | void;
    save(tableName: string, data: Object): Promise<any> | void;
    flushAll(): Promise<any>[] | void[];
}

export default RecordStorage;