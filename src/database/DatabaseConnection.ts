
export interface DatabaseConnection {

  query<T = void>(sql: string, parameters?: any[]): Promise<T>

}